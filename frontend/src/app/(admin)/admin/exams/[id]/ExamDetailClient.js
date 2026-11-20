'use client';

import { useAlerts } from '@/app/components/AlertProvider';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getBlobImageSrc } from '@frontend/lib/getBlobImageSrc';
import Icon from '@/app/components/Icon';

const QUESTION_TYPE_LABELS = {
  single_select: 'Single choice',
  multi_select: 'Multiple choice',
  rating_scale: 'Rating scale',
  image_choice: 'Image choice',
  multi_image_choice: 'Multiple image choice',
};

const formatDuration = (seconds) => {
  const totalMinutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds ? `${totalMinutes}m ${remainingSeconds}s` : `${totalMinutes} min`;
};
const formatQuestionTime = (seconds) => seconds < 60 ? `${seconds}s suggested` : `${Math.round(seconds / 60)} min suggested`;

export default function ExamDetailClient({ exam, sections, questions, options, canEdit }) {
  const { notify, confirmAction } = useAlerts();
  const router = useRouter();
  const [deletingSectionId, setDeletingSectionId] = useState(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);

  // Group questions by section ID
  const questionsBySection = questions.reduce((acc, q) => {
    if (!acc[q.sectionId]) acc[q.sectionId] = [];
    acc[q.sectionId].push(q);
    return acc;
  }, {});

  // Group options by question ID
  const optionsByQuestion = options.reduce((acc, opt) => {
    if (!acc[opt.questionId]) acc[opt.questionId] = [];
    acc[opt.questionId].push(opt);
    return acc;
  }, {});

  const totalDurationSeconds = sections.reduce((sum, section) => sum + section.durationMinutes * 60 + section.durationSeconds, 0);
  const maximumAssessmentScore = questions.reduce((total, question) => {
    const positiveScores = (optionsByQuestion[question.id] || []).map((option) => Math.max(0, option.score));
    return total + (['multi_select', 'multi_image_choice'].includes(question.questionType)
      ? positiveScores.reduce((sum, score) => sum + score, 0)
      : Math.max(0, ...positiveScores));
  }, 0);

  const handleDeleteSection = async (secId) => {
    if (!await confirmAction('This permanently deletes the section and all questions and answer choices within it.', { title: 'Delete this section?', confirmLabel: 'Delete section', tone: 'danger' })) {
      return;
    }
    
    setDeletingSectionId(secId);
    try {
      const res = await fetch(`/api/admin/sections/${secId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        notify('Section deleted successfully.');
        router.refresh();
      } else {
        const err = await res.json();
        notify(`Error deleting section: ${err.message}`);
      }
    } catch (error) {
      notify(`Error: ${error.message}`);
    } finally {
      setDeletingSectionId(null);
    }
  };

  const handleDeleteQuestion = async (qId) => {
    if (!await confirmAction('This permanently deletes the question, its options, and candidate responses to it.', { title: 'Delete this question?', confirmLabel: 'Delete question', tone: 'danger' })) {
      return;
    }
    
    setDeletingQuestionId(qId);
    try {
      const res = await fetch(`/api/admin/questions/${qId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        notify('Question deleted successfully.');
        router.refresh();
      } else {
        const err = await res.json();
        notify(`Error deleting question: ${err.message}`);
      }
    } catch (error) {
      notify(`Error: ${error.message}`);
    } finally {
      setDeletingQuestionId(null);
    }
  };

  return (
    <div className="exam-builder-page">
      <header className="builder-page-header">
        <div className="builder-title-group">
          <span className="page-kicker">ASSESSMENT BUILDER</span>
          <div className="builder-title-line">
            <Link href="/admin/exams" className="builder-back-link" aria-label="Back to assessments" title="Back to assessments">
              <Icon name="back" size={17} />
            </Link>
            <h1>{exam.title}</h1>
          </div>
          {exam.description && <p>{exam.description}</p>}
        </div>
        <div className="builder-header-actions">
          {canEdit && sections.length > 0 && (
            <Link href={`/admin/exams/${exam.id}/sections/add`} className="btn btn-primary builder-add-section">
              <Icon name="plus" size={17} /> Add section
            </Link>
          )}
          {canEdit && (
            <Link href={`/admin/exams/${exam.id}/edit`} className="btn btn-secondary builder-edit-action">
              <Icon name="edit" size={16} /> Edit details
            </Link>
          )}
          <details className="builder-more-actions">
            <summary><Icon name="more" size={18} /><span>More actions</span></summary>
            <div className="builder-actions-menu">
              <a href={`/api/admin/exams/${exam.id}/export/json`} download><Icon name="download" size={16} /> Export as JSON</a>
              <a href={`/api/admin/exams/${exam.id}/export/excel`} download><Icon name="download" size={16} /> Export as Excel</a>
              {canEdit && <Link href={`/admin/exams/${exam.id}/import`} className="is-destructive" title="Import a file to replace assessment content"><Icon name="upload" size={16} /> Import or replace assessment</Link>}
            </div>
          </details>
        </div>
      </header>

      {sections.length > 0 && (
        <section className="builder-overview" aria-label="Assessment overview">
          <article><span>Sections</span><strong>{sections.length}</strong></article>
          <article><span>Questions</span><strong>{questions.length}</strong></article>
          <article><span>Time allowed</span><strong>{formatDuration(totalDurationSeconds)}</strong></article>
          <article><span>Maximum score</span><strong>{maximumAssessmentScore.toLocaleString(undefined, { maximumFractionDigits: 2 })} <small>pts</small></strong></article>
        </section>
      )}

      {/* Sections and items rendering */}
      {sections.length === 0 ? (
        <section className="builder-empty-state">
          <div className="builder-empty-icon"><Icon name="assessments" size={23} /></div>
          <span className="builder-empty-kicker">YOUR NEXT STEP</span>
          <h2>Start with a section</h2>
          <p className="builder-empty-copy">Sections organize the assessment and set the time available for each part.</p>
          <div className="builder-steps" aria-label="Assessment setup steps">
            <div className="builder-step is-current">
              <span className="builder-step-number">1</span>
              <div><strong>Create a section</strong><small>Name it and set its time limit.</small></div>
            </div>
            <div className="builder-step-connector" aria-hidden="true" />
            <div className="builder-step">
              <span className="builder-step-number">2</span>
              <div><strong>Add questions</strong><small>Add answer choices and score weights.</small></div>
            </div>
          </div>
          {canEdit && (
            <Link href={`/admin/exams/${exam.id}/sections/add`} className="btn btn-primary builder-empty-cta">
              <Icon name="plus" size={17} /> Create first section
            </Link>
          )}
        </section>
      ) : (
        sections.map((section) => {
          const secQuestions = questionsBySection[section.id] || [];

          return (
            <div key={section.id} className="glass-card" style={{ marginBottom: '2.5rem', padding: '1.5rem' }}>
              
              {/* Section header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', background: 'var(--primary-glow)', border: '1px solid var(--primary)', padding: '0.2rem 0.55rem', borderRadius: '6px', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Order: {section.order}
                  </span>
                  <h3 style={{ marginTop: '0.5rem', color: '#fff', fontSize: '1.4rem' }}>{section.name}</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'inline-block' }}>
                    Limit: <strong>{section.durationMinutes}m {section.durationSeconds}s</strong>
                  </span>
                </div>
                
                {canEdit && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link href={`/admin/exams/${exam.id}/sections/${section.id}/questions/add`} className="btn btn-secondary" style={{ fontSize: '0.9rem', padding: '0.55rem 1rem', borderColor: 'var(--primary)', background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                      Add Question
                    </Link>
                    <Link href={`/admin/exams/${exam.id}/sections/${section.id}/edit`} className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                      Edit Section
                    </Link>
                    <button
                      onClick={() => handleDeleteSection(section.id)}
                      disabled={deletingSectionId === section.id}
                      className="btn btn-danger"
                      style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                    >
                      {deletingSectionId === section.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>

              {section.description && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', fontStyle: 'italic', background: 'rgba(255,255,255,0.01)', borderLeft: '3px solid var(--glass-border)', paddingLeft: '0.75rem' }}>
                  {section.description}
                </p>
              )}

              {/* Questions Loop */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {secQuestions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed var(--glass-border)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No questions added to this section yet.
                  </div>
                ) : (
                  secQuestions.map((q, qIndex) => {
                    const qOptions = optionsByQuestion[q.id] || [];

                    return (
                      <div key={q.id} style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '1.25rem', position: 'relative' }}>
                        
                        {/* Question actions */}
                        {canEdit && (
                          <div style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', display: 'flex', gap: '0.5rem' }}>
                            <Link href={`/admin/exams/${exam.id}/questions/${q.id}/edit`} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderColor: 'rgba(255,255,255,0.05)' }}>
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDeleteQuestion(q.id)}
                              disabled={deletingQuestionId === q.id}
                              className="btn btn-danger"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                            >
                              {deletingQuestionId === q.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        )}

                        {/* Question Text */}
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                            Question {qIndex + 1} · {QUESTION_TYPE_LABELS[q.questionType] || 'Single choice'} · {q.order}
                          </span>
                          {q.estimatedTimeSeconds > 0 && <span className="builder-question-time">{formatQuestionTime(q.estimatedTimeSeconds)}</span>}
                          <h4 style={{ marginTop: '0.25rem', marginBottom: '0.75rem', color: '#fff', fontWeight: 500, maxWidth: '80%', fontSize: '1.1rem' }}>
                            {q.text}
                          </h4>

                          {/* Question Image Preview */}
                          {q.image && (
                            <div style={{ margin: '0.75rem 0' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                                Question Image:
                              </span>
                              <img src={getBlobImageSrc(q.image)} alt="Question Graphic" style={{ maxHeight: '100px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', padding: '4px' }} />
                            </div>
                          )}

                          {/* Options Table/Grid */}
                          <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', margin: '0.5rem 0' }}>
                              Options & Score Weightings
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
                              {qOptions.length === 0 ? (
                                <span style={{ color: 'var(--accent-rose)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                                  No choices created. Click edit to add choices.
                                </span>
                              ) : (
                                qOptions.map((opt) => (
                                  <div key={opt.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '0.5rem 0.75rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                    {opt.image && (
                                      <div style={{ marginBottom: '0.25rem' }}>
                                        <img src={getBlobImageSrc(opt.image)} alt="Option Choice" style={{ maxHeight: '40px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', padding: '2px' }} />
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                      <span style={{ color: 'var(--text-primary)' }}>{opt.text}</span>
                                      <span style={{ background: 'color-mix(in srgb, var(--accent-green) 12%, transparent)', border: '1px solid var(--accent-green)', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 650, fontSize: '0.8rem', color: 'var(--accent-green)', marginLeft: '0.5rem' }}>
                                        +{opt.score}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
