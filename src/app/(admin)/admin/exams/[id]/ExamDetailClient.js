'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ExamDetailClient({ exam, sections, questions, options, canEdit }) {
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

  const handleDeleteSection = async (secId) => {
    if (!confirm('Are you sure you want to delete this section? This will cascadingly delete all questions and option choices in this section! This action cannot be undone.')) {
      return;
    }
    
    setDeletingSectionId(secId);
    try {
      const res = await fetch(`/api/admin/sections/${secId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Section deleted successfully.');
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Error deleting section: ${err.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setDeletingSectionId(null);
    }
  };

  const handleDeleteQuestion = async (qId) => {
    if (!confirm('Are you sure you want to delete this question? This will delete all options and candidate responses to this question! This action cannot be undone.')) {
      return;
    }
    
    setDeletingQuestionId(qId);
    try {
      const res = await fetch(`/api/admin/questions/${qId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Question deleted successfully.');
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Error deleting question: ${err.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setDeletingQuestionId(null);
    }
  };

  return (
    <div>
      {/* Breadcrumb path */}
      <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Link href="/admin/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Dashboard</Link>
        <span>/</span>
        <Link href="/admin/exams" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Exams</Link>
        <span>/</span>
        <span style={{ color: '#fff' }}>Builder</span>
      </div>

      {/* Header and export buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ background: 'linear-gradient(135deg, #fff, var(--text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '2.2rem', margin: 0 }}>
            {exam.title}
          </h1>
          {exam.description && (
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.95rem' }}>{exam.description}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a href={`/api/admin/exams/${exam.id}/export/json`} className="btn btn-secondary" title="Export as JSON" download>
            Export JSON
          </a>
          <a href={`/api/admin/exams/${exam.id}/export/excel`} className="btn btn-secondary" title="Export as Excel" download>
            Export Excel
          </a>
          {canEdit && (
            <>
              <Link href={`/admin/exams/${exam.id}/import`} className="btn btn-secondary" style={{ borderColor: 'rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.05)', color: '#f43f5e' }} title="Overwrite with new file">
                Overwrite/Import
              </Link>
              <Link href={`/admin/exams/${exam.id}/edit`} className="btn btn-secondary">
                Edit Title
              </Link>
              <Link href={`/admin/exams/${exam.id}/sections/add`} className="btn btn-primary">
                Add Section
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Sections and items rendering */}
      {sections.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>No Sections Created</h3>
          <p style={{ color: 'var(--text-muted)' }}>Create at least one section to start designing questions for this exam.</p>
          {canEdit && (
            <Link href={`/admin/exams/${exam.id}/sections/add`} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
              Add Section
            </Link>
          )}
        </div>
      ) : (
        sections.map((section) => {
          const secQuestions = questionsBySection[section.id] || [];

          return (
            <div key={section.id} className="glass-card" style={{ marginBottom: '2.5rem', padding: '1.5rem' }}>
              
              {/* Section header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', background: 'var(--primary-glow)', border: '1px solid var(--primary)', padding: '0.15rem 0.5rem', borderRadius: '4px', color: '#d8b4fe', fontWeight: 700, textTransform: 'uppercase' }}>
                    Order: {section.order}
                  </span>
                  <h3 style={{ marginTop: '0.5rem', color: '#fff', fontSize: '1.4rem' }}>{section.name}</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'inline-block' }}>
                    Limit: <strong>{section.durationMinutes}m {section.durationSeconds}s</strong>
                  </span>
                </div>
                
                {canEdit && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link href={`/admin/exams/${exam.id}/sections/${section.id}/questions/add`} className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', borderColor: 'rgba(6, 182, 212, 0.3)', background: 'rgba(6,182,212,0.05)', color: '#22d3ee' }}>
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
                            Question {qIndex + 1} - {q.questionType === 'single_select' ? 'Single Choice' : 'Multi-Select'} (Order: {q.order})
                          </span>
                          <h4 style={{ marginTop: '0.25rem', marginBottom: '0.75rem', color: '#fff', fontWeight: 500, maxWidth: '80%', fontSize: '1.1rem' }}>
                            {q.text}
                          </h4>

                          {/* Question Image Preview */}
                          {q.image && (
                            <div style={{ margin: '0.75rem 0' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                                Question Image:
                              </span>
                              <img src={q.image} alt="Question Graphic" style={{ maxHeight: '100px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', padding: '4px' }} />
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
                                        <img src={opt.image} alt="Option Choice" style={{ maxHeight: '40px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', padding: '2px' }} />
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                      <span style={{ color: 'var(--text-primary)' }}>{opt.text}</span>
                                      <span style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-green)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem', color: '#34d399', marginLeft: '0.5rem' }}>
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
