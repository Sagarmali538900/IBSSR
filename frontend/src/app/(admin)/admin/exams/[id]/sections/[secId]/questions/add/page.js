'use client';

import { useAlerts } from '@/app/components/AlertProvider';
import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { compressImage } from '@frontend/lib/compressImage';
import { inputSchemas, validateImageFiles, validateInput } from '@/lib/validation';

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
  single_select: {
    heading: 'Build answer choices',
    guidance: 'Candidates select one choice. Set the score weight for each response.',
    choiceLabel: 'Answer choice',
    choicePlaceholder: (index) => `Choice ${index + 1}`,
    imageLabel: 'Image',
    imageHint: 'Attach an image to this choice',
  },
  multi_select: {
    heading: 'Build answer choices',
    guidance: 'Candidates can select several choices. Positive score weights are added together.',
    choiceLabel: 'Answer choice',
    choicePlaceholder: (index) => `Choice ${index + 1}`,
    imageLabel: 'Image',
    imageHint: 'Attach an image to this choice',
  },
  rating_scale: {
    heading: 'Build the rating scale',
    guidance: 'Use ordered responses on a consistent scale. Adjust the labels and score weights to fit your question.',
    choiceLabel: 'Scale response',
    choicePlaceholder: (index) => `Scale point ${index + 1}`,
    imageLabel: 'Image',
    imageHint: 'Attach an image to this response',
  },
  image_choice: {
    heading: 'Build image choices',
    guidance: 'Add a descriptive label and an image for each visual response.',
    choiceLabel: 'Image choice label',
    choicePlaceholder: (index) => `Image choice ${index + 1}`,
    imageLabel: 'Choice image',
    imageHint: 'Required for image choices',
  },
  multi_image_choice: {
    heading: 'Build image choices',
    guidance: 'Add a descriptive label and an image for each visual response. Candidates can select several.',
    choiceLabel: 'Image choice label',
    choicePlaceholder: (index) => `Image choice ${index + 1}`,
    imageLabel: 'Choice image',
    imageHint: 'Required for image choices',
  },
};

const createOptions = (questionType) => {
  const texts = questionType === 'rating_scale'
    ? ['Strongly disagree', 'Disagree', 'Neither agree nor disagree', 'Agree', 'Strongly agree']
    : [];
  return Array.from({ length: questionType === 'rating_scale' ? 5 : 4 }, (_, index) => ({
    text: texts[index] || '',
    score: questionType === 'rating_scale' ? index + 1 : 0,
    imageFile: null,
  }));
};

export default function AddQuestionPage({ params }) {
  const { notify } = useAlerts();
  const router = useRouter();
  const { id: examId, secId } = use(params);
  const [text, setText] = useState('');
  const [selectionMode, setSelectionMode] = useState('single');
  const [answerStyle, setAnswerStyle] = useState('text');
  const [estimatedTimeSeconds, setEstimatedTimeSeconds] = useState(60);
  const [order, setOrder] = useState(1);
  const [imageFile, setImageFile] = useState(null);
  const [optionsByType, setOptionsByType] = useState(() => Object.fromEntries(
    ['single_select', 'multi_select', 'rating_scale', 'image_choice', 'multi_image_choice'].map((value) => [value, createOptions(value)]),
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
    if (nextStyle === 'rating_scale') setSelectionMode('single');
  };

  const handleOptionChange = (index, field, value) => {
    updateCurrentOptions((current) => current.map((option, optionIndex) => optionIndex === index ? { ...option, [field]: value } : option));
  };

  const addOptionField = () => updateCurrentOptions((current) => [...current, { text: '', score: 0, imageFile: null }]);
  const removeOptionField = (index) => {
    if (options.length <= 1) return notify('A question must have at least one option.', 'warning');
    updateCurrentOptions((current) => current.filter((_, optionIndex) => optionIndex !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const filledOptions = options.filter((option) => option.text.trim());
    const validation = validateInput(inputSchemas.question, { text, questionType, estimatedTimeSeconds, order, options: filledOptions });
    if (!validation.success) return notify(validation.message, 'warning');
    if ((questionType === 'image_choice' || questionType === 'multi_image_choice') && filledOptions.some((option) => !option.imageFile)) {
      return notify('Add an image for every image choice.', 'warning');
    }
    const imageError = validateImageFiles([imageFile, ...filledOptions.map((option) => option.imageFile)]);
    if (imageError) return notify(imageError, 'warning');

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('text', validation.data.text);
      formData.append('questionType', questionType);
      formData.append('estimatedTimeSeconds', String(validation.data.estimatedTimeSeconds));
      formData.append('order', String(validation.data.order));
      if (imageFile) formData.append('image', await compressImage(imageFile));

      for (let index = 0; index < filledOptions.length; index += 1) {
        const option = filledOptions[index];
        formData.append(`option_text_${index}`, option.text);
        formData.append(`option_score_${index}`, String(option.score));
        if (option.imageFile) formData.append(`option_image_${index}`, await compressImage(option.imageFile));
      }

      const response = await fetch(`/api/admin/sections/${secId}/questions`, { method: 'POST', body: formData });
      if (response.ok) {
        notify('Question added to the section.');
        router.push(`/admin/exams/${examId}`);
        router.refresh();
      } else {
        const error = await response.json();
        notify(`Could not add question: ${error.message}`);
      }
    } catch (error) {
      notify(`Could not add question: ${error.message}`);
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
      <nav className="question-editor-breadcrumb" aria-label="Breadcrumb">
        <Link href={`/admin/exams/${examId}`}>Assessment builder</Link><span aria-hidden="true">/</span><span>Add question</span>
      </nav>
      <header className="question-editor-heading">
        <div><span className="question-editor-kicker">QUESTION DESIGN</span><h1>Add a question</h1><p>Choose how candidates respond, then set the answer choices and score weights.</p></div>
        <div className="question-editor-summary"><span>Section timing</span><strong>Configured at section level</strong></div>
      </header>

      <form className="question-editor-form" onSubmit={handleSubmit} encType="multipart/form-data">
        <section className="question-editor-panel" aria-labelledby="question-type-title">
          <div className="question-panel-heading"><div><span className="question-editor-kicker">STEP 1</span><h2 id="question-type-title">Choose how candidates respond</h2><p>Set the number of responses, then choose how the options are shown.</p></div></div>
          <div className="question-selection-grid" aria-label="Number of responses">
            {SELECTION_MODES.map((mode) => (
              <button key={mode.value} type="button" className={`question-type-card${selectionMode === mode.value ? ' is-selected' : ''}`} onClick={() => setSelectionMode(mode.value)} aria-pressed={selectionMode === mode.value} disabled={loading || (answerStyle === 'rating_scale' && mode.value === 'multiple')}>
                <span className="question-type-radio" aria-hidden="true" /><strong>{mode.title}</strong><span>{mode.description}</span>
              </button>
            ))}
          </div>
          <div className="question-answer-style">
            <div className="question-answer-style-heading"><strong>Answer style</strong><span>Rating scales use one response; text and image choices can use either selection mode.</span></div>
            <div className="question-style-grid" aria-label="Answer style">
              {ANSWER_STYLES.map((style) => (
                <button key={style.value} type="button" className={`question-type-card${answerStyle === style.value ? ' is-selected' : ''}`} onClick={() => handleAnswerStyleChange(style.value)} aria-pressed={answerStyle === style.value} disabled={loading}>
                  <span className="question-type-radio" aria-hidden="true" /><strong>{style.title}</strong><span>{style.description}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="question-editor-panel" aria-labelledby="prompt-title">
          <div className="question-panel-heading"><div><span className="question-editor-kicker">STEP 2</span><h2 id="prompt-title">Write the prompt</h2><p>Keep wording clear, neutral, and appropriate for the audience.</p></div></div>
          <div className="question-form-grid">
            <div className="question-form-field question-prompt-field"><label htmlFor="question-prompt">Question text</label><textarea id="question-prompt" rows={4} maxLength={5000} placeholder="Write the question candidates will see…" value={text} onChange={(event) => setText(event.target.value)} disabled={loading} required /><small>{text.length} / 5,000 characters</small></div>
            <div className="question-form-field"><label htmlFor="question-order">Question order</label><input id="question-order" type="number" min={0} max={10000} value={order} onChange={(event) => setOrder(Number(event.target.value))} disabled={loading} required /><small>Controls where it appears within this section.</small></div>
            <div className="question-form-field"><label htmlFor="question-time">Suggested time</label><div className="question-time-input"><input id="question-time" type="number" min={0} max={3600} value={estimatedTimeSeconds} onChange={(event) => setEstimatedTimeSeconds(event.target.value)} disabled={loading} required /><span>seconds</span></div><small>Planning guide only; the section timer is enforced.</small></div>
          </div>
          <div className="question-form-field question-image-field"><label htmlFor="question-image">Question image <span>Optional</span></label><input id="question-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setImageFile(event.target.files?.[0] || null)} disabled={loading} /><small>{imageFile ? imageFile.name : 'Add a diagram or visual context (JPEG, PNG, WebP or GIF; up to 5 MB).'}</small></div>
        </section>

        <section className="question-editor-panel" aria-labelledby="answers-title">
          <div className="question-panel-heading question-answers-heading"><div><span className="question-editor-kicker">STEP 3</span><h2 id="answers-title">{answerFormat.heading}</h2><p>{answerFormat.guidance}</p></div><button type="button" className="question-add-option" onClick={addOptionField} disabled={loading}>{answerStyle === 'rating_scale' ? 'Add scale point' : answerStyle === 'image_choice' ? 'Add image choice' : 'Add answer choice'}</button></div>
          <div className="question-options-list">
            {options.map((option, index) => (
              <article className="question-option-editor" key={index}>
                <span className="question-option-number">{String(index + 1).padStart(2, '0')}</span>
                <div className="question-option-fields">
                  <div className="question-form-field"><label htmlFor={`option-text-${index}`}>{answerFormat.choiceLabel}</label><input id={`option-text-${index}`} type="text" maxLength={1000} placeholder={answerFormat.choicePlaceholder(index)} value={option.text} onChange={(event) => handleOptionChange(index, 'text', event.target.value)} disabled={loading} /></div>
                  <div className="question-form-field question-option-score"><label htmlFor={`option-score-${index}`}>Score weight</label><input id={`option-score-${index}`} type="number" step="0.1" min={-100000} max={100000} value={option.score} onChange={(event) => handleOptionChange(index, 'score', event.target.value)} disabled={loading} /><small>Points for this response</small></div>
                  <div className="question-form-field question-option-image"><label htmlFor={`option-image-${index}`}>{answerFormat.imageLabel} {answerStyle !== 'image_choice' && <span>Optional</span>}</label><input id={`option-image-${index}`} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => handleOptionChange(index, 'imageFile', event.target.files?.[0] || null)} disabled={loading} /><small>{option.imageFile?.name || answerFormat.imageHint}</small></div>
                </div>
                <button type="button" className="question-remove-option" onClick={() => removeOptionField(index)} disabled={loading || options.length === 1} aria-label={`Remove choice ${index + 1}`}>Remove</button>
              </article>
            ))}
          </div>
          <div className="question-score-summary"><div><span>Maximum score for this question</span><small>{['multi_select', 'multi_image_choice'].includes(questionType) ? 'Sum of positive choice weights' : 'Highest positive choice weight'}</small></div><strong>{maximumScore.toLocaleString(undefined, { maximumFractionDigits: 2 })}<span> pts</span></strong></div>
        </section>

        <aside className="question-timing-note"><strong>Timing is managed by the section.</strong><span>Candidates answer all questions in this section within the section time limit.</span></aside>
        <div className="question-editor-actions"><Link href={`/admin/exams/${examId}`} className="question-cancel">Cancel</Link><button type="submit" className="question-save" disabled={loading}>{loading ? 'Saving question…' : 'Add question to section'}</button></div>
      </form>
    </main>
  );
}
