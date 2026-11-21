'use client';

import { useAlerts } from '@/app/components/AlertProvider';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { compressImage } from '@frontend/lib/compressImage';
import { getBlobImageSrc } from '@frontend/lib/getBlobImageSrc';
import FieldError from '@/app/components/FieldError';
import { getValidationErrors, inputSchemas, validateImageFiles } from '@/lib/validation';

const SELECTION_MODES = [
  { value: 'single', title: 'Choose one', description: 'Candidates select one response.' },
  { value: 'multiple', title: 'Choose all that apply', description: 'Candidates can select several responses.' },
];

const ANSWER_STYLES = [
  { value: 'text', title: 'Text choices', description: 'Show labeled answer choices.' },
  { value: 'rating_scale', title: 'Rating scale', description: 'Offer ordered responses, such as agreement levels.' },
  { value: 'image_choice', title: 'Image choices', description: 'Show an image with each response.' },
];

const ANSWER_FORMATS = {
  single_select: { heading: 'Build answer choices', guidance: 'Candidates select one choice. Set the score weight for each response.', choiceLabel: 'Answer choice', imageLabel: 'Image', imageHint: 'Attach an image to this choice', addLabel: 'Add answer choice' },
  multi_select: { heading: 'Build answer choices', guidance: 'Candidates can select several choices. Positive score weights are added together.', choiceLabel: 'Answer choice', imageLabel: 'Image', imageHint: 'Attach an image to this choice', addLabel: 'Add answer choice' },
  rating_scale: { heading: 'Build the rating scale', guidance: 'Use ordered responses on a consistent scale. Adjust the labels and score weights to fit your question.', choiceLabel: 'Scale response', imageLabel: 'Image', imageHint: 'Attach an image to this response', addLabel: 'Add scale point' },
  image_choice: { heading: 'Build image choices', guidance: 'Add a descriptive label and an image for each visual response.', choiceLabel: 'Image choice label', imageLabel: 'Choice image', imageHint: 'Required for image choices', addLabel: 'Add image choice' },
  multi_image_choice: { heading: 'Build image choices', guidance: 'Add a descriptive label and an image for each visual response. Candidates can select several.', choiceLabel: 'Image choice label', imageLabel: 'Choice image', imageHint: 'Required for image choices', addLabel: 'Add image choice' },
};

const createEmptyOption = () => ({ id: null, text: '', score: 0, image: null, newImageFile: null, clearImage: false });

const createOptions = (questionType) => {
  const texts = questionType === 'rating_scale'
    ? ['Strongly disagree', 'Disagree', 'Neither agree nor disagree', 'Agree', 'Strongly agree']
    : [];
  return Array.from({ length: questionType === 'rating_scale' ? 5 : 4 }, (_, index) => ({
    ...createEmptyOption(),
    text: texts[index] || '',
    score: questionType === 'rating_scale' ? index + 1 : 0,
  }));
};

export default function EditQuestionClient({ examId, question, initialOptions }) {
  const { notify } = useAlerts();
  const router = useRouter();

  const [text, setText] = useState(question.text);
  const [selectionMode, setSelectionMode] = useState(['multi_select', 'multi_image_choice'].includes(question.questionType) ? 'multiple' : 'single');
  const [answerStyle, setAnswerStyle] = useState(question.questionType === 'rating_scale' ? 'rating_scale' : question.questionType.includes('image_choice') ? 'image_choice' : 'text');
  const [order, setOrder] = useState(question.order);
  const [estimatedTimeSeconds, setEstimatedTimeSeconds] = useState(question.estimatedTimeSeconds || 0);
  
  const [imageFile, setImageFile] = useState(null);
  const [clearImage, setClearImage] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [optionsByType, setOptionsByType] = useState(() => Object.fromEntries(
    ['single_select', 'multi_select', 'rating_scale', 'image_choice', 'multi_image_choice'].map((value) => [value, value === question.questionType
      ? initialOptions.map((option) => ({
          id: option.id,
          text: option.text,
          score: option.score,
          image: option.image,
          newImageFile: null,
          clearImage: false,
        }))
      : createOptions(value)]),
  ));

  const [loading, setLoading] = useState(false);
  const questionType = answerStyle === 'rating_scale'
    ? 'rating_scale'
    : answerStyle === 'image_choice'
      ? (selectionMode === 'multiple' ? 'multi_image_choice' : 'image_choice')
      : (selectionMode === 'multiple' ? 'multi_select' : 'single_select');
  const options = optionsByType[questionType];

  const updateCurrentOptions = (update) => setOptionsByType((current) => ({
    ...current,
    [questionType]: typeof update === 'function' ? update(current[questionType]) : update,
  }));

  const handleAnswerStyleChange = (nextStyle) => {
    setAnswerStyle(nextStyle);
    setFieldErrors({});
    if (nextStyle === 'rating_scale') setSelectionMode('single');
  };

  const handleSelectionModeChange = (nextMode) => {
    setSelectionMode(nextMode);
    setFieldErrors({});
  };

  const handleOptionChange = (index, field, value) => {
    updateCurrentOptions((current) => current.map((option, optionIndex) => optionIndex === index ? { ...option, [field]: value } : option));
    setFieldErrors({});
  };

  const addOptionField = () => {
    setFieldErrors({});
    updateCurrentOptions((current) => [...current, createEmptyOption()]);
  };

  const removeOptionField = (index) => {
    if (options.length <= 1) {
      notify('A question must have at least one option.');
      return;
    }
    setFieldErrors({});
    updateCurrentOptions((current) => current.filter((_, optionIndex) => optionIndex !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const filledOptions = options.filter(opt => opt.text.trim());
    const validation = inputSchemas.question.safeParse({ text, questionType, estimatedTimeSeconds, order, options: filledOptions });
    if (!validation.success) {
      setFieldErrors(getValidationErrors(validation));
      return;
    }
    const nextImageErrors = {};
    if (questionType === 'image_choice' || questionType === 'multi_image_choice') {
      filledOptions.forEach((option, index) => {
        if (!option.newImageFile && (!option.image || option.clearImage)) nextImageErrors[`options.${index}.image`] = 'Add an image for this choice.';
      });
    }
    const questionImageError = validateImageFiles([imageFile]);
    if (questionImageError) nextImageErrors.questionImage = questionImageError;
    filledOptions.forEach((option, index) => {
      const imageError = validateImageFiles([option.newImageFile]);
      if (imageError) nextImageErrors[`options.${index}.image`] = imageError;
    });
    if (Object.keys(nextImageErrors).length) {
      setFieldErrors(nextImageErrors);
      return;
    }
    setFieldErrors({});

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('questionType', questionType);
      formData.append('estimatedTimeSeconds', String(validation.data.estimatedTimeSeconds));
      formData.append('order', order);

      if (clearImage) {
        formData.append('clear_image', 'true');
      } else if (imageFile) {
        const compressed = await compressImage(imageFile);
        formData.append('image', compressed);
      }

      for (let index = 0; index < filledOptions.length; index++) {
        const opt = filledOptions[index];
        if (opt.id) {
          formData.append(`option_id_${index}`, opt.id);
        }
        formData.append(`option_text_${index}`, opt.text);
        formData.append(`option_score_${index}`, opt.score);

        if (opt.clearImage) {
          formData.append(`option_clear_image_${index}`, 'true');
        } else if (opt.newImageFile) {
          const compressedOpt = await compressImage(opt.newImageFile);
          formData.append(`option_image_${index}`, compressedOpt);
        }
      }

      const res = await fetch(`/api/admin/questions/${question.id}`, {
        method: 'PUT',
        body: formData
      });

      if (res.ok) {
        notify('Question and options updated successfully.');
        router.push(`/admin/exams/${examId}`);
        router.refresh();
      } else {
        const err = await res.json();
        notify(`Error: ${err.message}`);
      }
    } catch (error) {
      notify(`Error updating question: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filledOptions = options.filter((option) => option.text.trim());
  const answerFormat = ANSWER_FORMATS[questionType];
  const maximumScore = filledOptions.length
    ? questionType === 'multi_select' || questionType === 'multi_image_choice'
      ? filledOptions.reduce((sum, option) => sum + Math.max(0, Number(option.score) || 0), 0)
      : Math.max(0, ...filledOptions.map((option) => Number(option.score) || 0))
    : 0;

  return (
    <main className="question-editor-page">
      <nav className="question-editor-breadcrumb" aria-label="Breadcrumb"><Link href={`/admin/exams/${examId}`}>Assessment builder</Link><span aria-hidden="true">/</span><span>Edit question</span></nav>
      <header className="question-editor-heading"><div><span className="question-editor-kicker">QUESTION DESIGN</span><h1>Edit question</h1><p>Adjust how candidates respond, the answer style, prompt, media, or score weights.</p></div><div className="question-editor-summary"><span>Section timing</span><strong>Configured at section level</strong></div></header>

      <form className="question-editor-form" noValidate onSubmit={handleSubmit} encType="multipart/form-data">
        <section className="question-editor-panel" aria-labelledby="question-type-title">
          <div className="question-panel-heading"><div><span className="question-editor-kicker">STEP 1</span><h2 id="question-type-title">Choose how candidates respond</h2><p>Set the number of responses, then choose how the options are shown.</p></div></div>
          <div className="question-selection-grid" aria-label="Number of responses">
            {SELECTION_MODES.map((mode) => <button key={mode.value} type="button" className={`question-type-card${selectionMode === mode.value ? ' is-selected' : ''}`} onClick={() => handleSelectionModeChange(mode.value)} aria-pressed={selectionMode === mode.value} disabled={loading || (answerStyle === 'rating_scale' && mode.value === 'multiple')}><span className="question-type-radio" aria-hidden="true" /><strong>{mode.title}</strong><span>{mode.description}</span></button>)}
          </div>
          <div className="question-answer-style">
            <div className="question-answer-style-heading"><strong>Answer style</strong><span>Rating scales use one response; text and image choices can use either selection mode.</span></div>
            <div className="question-style-grid" aria-label="Answer style">
              {ANSWER_STYLES.map((style) => <button key={style.value} type="button" className={`question-type-card${answerStyle === style.value ? ' is-selected' : ''}`} onClick={() => handleAnswerStyleChange(style.value)} aria-pressed={answerStyle === style.value} disabled={loading}><span className="question-type-radio" aria-hidden="true" /><strong>{style.title}</strong><span>{style.description}</span></button>)}
            </div>
          </div>
        </section>

        <section className="question-editor-panel" aria-labelledby="prompt-title">
          <div className="question-panel-heading"><div><span className="question-editor-kicker">STEP 2</span><h2 id="prompt-title">Question prompt</h2><p>Use clear wording that is comfortable for the intended age group.</p></div></div>
          <div className="question-form-grid">
            <div className="question-form-field question-prompt-field"><label htmlFor="question-prompt">Question text</label><textarea id="question-prompt" rows={4} maxLength={5000} value={text} onChange={(event) => { setText(event.target.value); if (fieldErrors.text) setFieldErrors((current) => ({ ...current, text: '' })); }} disabled={loading} aria-invalid={Boolean(fieldErrors.text)} aria-describedby={fieldErrors.text ? 'question-text-error' : undefined} /><small>{text.length} / 5,000 characters</small><FieldError id="question-text-error" message={fieldErrors.text} /></div>
            <div className="question-form-field"><label htmlFor="question-order">Question order</label><input id="question-order" type="number" min={0} max={10000} value={order} onChange={(event) => { setOrder(event.target.value); if (fieldErrors.order) setFieldErrors((current) => ({ ...current, order: '' })); }} disabled={loading} aria-invalid={Boolean(fieldErrors.order)} aria-describedby={fieldErrors.order ? 'question-order-error' : undefined} /><small>Position within this section.</small><FieldError id="question-order-error" message={fieldErrors.order} /></div>
            <div className="question-form-field"><label htmlFor="question-time">Suggested time</label><div className="question-time-input"><input id="question-time" type="number" min={0} max={3600} value={estimatedTimeSeconds} onChange={(event) => { setEstimatedTimeSeconds(event.target.value); if (fieldErrors.estimatedTimeSeconds) setFieldErrors((current) => ({ ...current, estimatedTimeSeconds: '' })); }} disabled={loading} aria-invalid={Boolean(fieldErrors.estimatedTimeSeconds)} aria-describedby={fieldErrors.estimatedTimeSeconds ? 'question-time-error' : undefined} /><span>seconds</span></div><small>Planning guide only; the section timer is enforced.</small><FieldError id="question-time-error" message={fieldErrors.estimatedTimeSeconds} /></div>
          </div>
          <div className="question-form-field question-image-field"><label htmlFor="question-image">Question image <span>Optional</span></label>
            {question.image && !clearImage && <div className="question-current-image"><img src={getBlobImageSrc(question.image)} alt="Current question visual" /><label><input type="checkbox" checked={clearImage} onChange={(event) => setClearImage(event.target.checked)} /> Remove current image</label></div>}
            <input type="file" id="question-image" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { setImageFile(event.target.files?.[0] || null); setClearImage(false); setFieldErrors((current) => ({ ...current, questionImage: '' })); }} disabled={loading} aria-invalid={Boolean(fieldErrors.questionImage)} aria-describedby={fieldErrors.questionImage ? 'question-image-error' : undefined} /><small>{imageFile?.name || 'Replace or add a diagram, photo, or illustration (up to 5 MB).'}</small><FieldError id="question-image-error" message={fieldErrors.questionImage} />
          </div>
        </section>

        <section className="question-editor-panel" aria-labelledby="answers-title">
          <div className="question-panel-heading question-answers-heading"><div><span className="question-editor-kicker">STEP 3</span><h2 id="answers-title" tabIndex={-1}>{answerFormat.heading}</h2><p>{answerFormat.guidance}</p></div><button type="button" className="question-add-option" onClick={addOptionField} disabled={loading}>{answerFormat.addLabel}</button></div>
          <FieldError id="answer-options-error" message={fieldErrors.options} />
          <div className="question-options-list">
            {options.map((option, index) => (
              <article className="question-option-editor" key={option.id || index}>
                <span className="question-option-number">{String(index + 1).padStart(2, '0')}</span>
                <div className="question-option-fields">
                  <div className="question-form-field"><label htmlFor={`option-text-${index}`}>{answerFormat.choiceLabel}</label><input id={`option-text-${index}`} type="text" maxLength={1000} placeholder={answerStyle === 'image_choice' ? `Image choice ${index + 1}` : answerStyle === 'rating_scale' ? `Scale point ${index + 1}` : `Choice ${index + 1}`} value={option.text} onChange={(event) => handleOptionChange(index, 'text', event.target.value)} disabled={loading} aria-invalid={Boolean(fieldErrors[`options.${filledOptions.indexOf(option)}.text`])} aria-describedby={fieldErrors[`options.${filledOptions.indexOf(option)}.text`] ? `option-text-error-${index}` : undefined} /><FieldError id={`option-text-error-${index}`} message={fieldErrors[`options.${filledOptions.indexOf(option)}.text`]} /></div>
                  <div className="question-form-field question-option-score"><label htmlFor={`option-score-${index}`}>Score weight</label><input id={`option-score-${index}`} type="number" step="0.1" min={-100000} max={100000} value={option.score} onChange={(event) => handleOptionChange(index, 'score', event.target.value)} disabled={loading} aria-invalid={Boolean(fieldErrors[`options.${filledOptions.indexOf(option)}.score`])} aria-describedby={fieldErrors[`options.${filledOptions.indexOf(option)}.score`] ? `option-score-error-${index}` : undefined} /><small>Points for this response</small><FieldError id={`option-score-error-${index}`} message={fieldErrors[`options.${filledOptions.indexOf(option)}.score`]} /></div>
                  <div className="question-form-field question-option-image"><label htmlFor={`option-image-${index}`}>{answerFormat.imageLabel} {answerStyle !== 'image_choice' && <span>Optional</span>}</label>
                    {option.image && !option.clearImage && <div className="question-current-image is-option"><img src={getBlobImageSrc(option.image)} alt={`Current image for choice ${index + 1}`} /><label><input type="checkbox" checked={option.clearImage} onChange={(event) => handleOptionChange(index, 'clearImage', event.target.checked)} /> Remove</label></div>}
                    <input id={`option-image-${index}`} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { handleOptionChange(index, 'newImageFile', event.target.files?.[0] || null); handleOptionChange(index, 'clearImage', false); }} disabled={loading} aria-invalid={Boolean(fieldErrors[`options.${filledOptions.indexOf(option)}.image`])} aria-describedby={fieldErrors[`options.${filledOptions.indexOf(option)}.image`] ? `option-image-error-${index}` : undefined} /><small>{option.newImageFile?.name || answerFormat.imageHint}</small><FieldError id={`option-image-error-${index}`} message={fieldErrors[`options.${filledOptions.indexOf(option)}.image`]} />
                  </div>
                </div>
                <button type="button" className="question-remove-option" onClick={() => removeOptionField(index)} disabled={loading || options.length === 1} aria-label={`Remove choice ${index + 1}`}>Remove</button>
              </article>
            ))}
          </div>
          <div className="question-score-summary"><div><span>Maximum score for this question</span><small>{['multi_select', 'multi_image_choice'].includes(questionType) ? 'Sum of positive choice weights' : 'Highest positive choice weight'}</small></div><strong>{maximumScore.toLocaleString(undefined, { maximumFractionDigits: 2 })}<span> pts</span></strong></div>
        </section>
        <aside className="question-timing-note"><strong>Timing is managed by the section.</strong><span>Candidates answer all questions in this section within the section time limit.</span></aside>
        <div className="question-editor-actions"><Link href={`/admin/exams/${examId}`} className="question-cancel">Cancel</Link><button type="submit" className="question-save" disabled={loading}>{loading ? 'Saving question…' : 'Save question changes'}</button></div>
      </form>
    </main>
  );
}
