'use client';

import { useAlerts } from '@/app/components/AlertProvider';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getBlobImageSrc } from '@frontend/lib/getBlobImageSrc';
import Icon from '@/app/components/Icon';
import { inputSchemas, validateInput } from '@/lib/validation';

export default function ExamRunClient({
  sessionId,
  section,
  questions,
  initialTimeLeft,
  initialSavedAnswers,
  sectionsData
}) {
  const { notify, confirmAction } = useAlerts();
  const router = useRouter();

  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const [savedAnswers, setSavedAnswers] = useState(initialSavedAnswers);
  const [submitting, setSubmitting] = useState(false);

  const timerRef = useRef(null);

  // 1. Scroll to top of Question 1 whenever section opens/switches
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [section.id]);

  // 2. Countdown timer effect
  useEffect(() => {
    setTimeLeft(initialTimeLeft);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initialTimeLeft, section.id]);

  const handleAutoSubmit = async () => {
    if (submitting) return;
    const validation = validateInput(inputSchemas.submitSection, { sessionId, answers: savedAnswers });
    if (!validation.success) {
      notify(validation.message, 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/candidate/answers/submit-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data)
      });

      if (res.ok) {
        const data = await res.json();
        router.push(data.nextUrl);
        router.refresh();
      } else {
        notify('Time expired. Auto-advancing section...');
        router.refresh();
      }
    } catch (err) {
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    const validation = validateInput(inputSchemas.submitSection, { sessionId, answers: savedAnswers });
    if (!validation.success) {
      notify(validation.message, 'error');
      return;
    }
    if (!await confirmAction('After submission, you cannot return to this section or change its answers.', { title: 'Submit this section?', confirmLabel: 'Submit section', tone: 'warning' })) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/candidate/answers/submit-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data)
      });

      if (res.ok) {
        const data = await res.json();
        router.push(data.nextUrl);
        router.refresh();
      } else {
        const err = await res.json();
        notify(`Error submitting section: ${err.message}`);
      }
    } catch (error) {
      notify(`Error submitting section: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChoiceSelect = async (questionId, optionId, questionType) => {
    const prevSelection = savedAnswers[questionId] || [];
    let updatedSelection = [];

    if (questionType === 'single_select') {
      updatedSelection = [optionId];
    } else {
      // Multi select: toggle selection
      if (prevSelection.includes(optionId)) {
        updatedSelection = prevSelection.filter(id => id !== optionId);
      } else {
        updatedSelection = [...prevSelection, optionId];
      }
    }

    const validation = validateInput(inputSchemas.saveAnswer, { sessionId, questionId, optionIds: updatedSelection });
    if (!validation.success) {
      notify(validation.message, 'error');
      return;
    }

    // Update local state
    const newAnswers = { ...savedAnswers, [questionId]: updatedSelection };
    setSavedAnswers(newAnswers);

    // Fire background save request
    try {
      await fetch('/api/candidate/answers/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data)
      });
    } catch (error) {
      console.warn('Background answer auto-save failed:', error);
    }
  };

  // Real-time calculation of active section question counts
  const activeAnsweredCount = questions.filter(
    (q) => savedAnswers[q.id] && savedAnswers[q.id].length > 0
  ).length;
  const activeRemainingCount = questions.length - activeAnsweredCount;

  // Helper formatting for timer
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Timer bar percentage width
  const progressPct = section.totalDurationSeconds > 0
    ? (timeLeft / section.totalDurationSeconds) * 100
    : 0;

  const scrollToQuestion = (idx) => {
    const el = document.getElementById(`question-card-${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', background: 'radial-gradient(circle at 50% 0%, #1c1936 0%, #07070a 80%)', padding: '2rem' }}>
      
      {/* Top Banner: Timer and Progress */}
      <div className="timer-container" style={{ maxWidth: '1200px', margin: '0 auto 2rem auto', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>
            Section Timer Count
          </span>
          <div className="timer-text">{formatTime(timeLeft)}</div>
        </div>
        
        <div className="timer-progress-bg">
          <div
            className="timer-progress-bar"
            style={{
              width: `${progressPct}%`,
              background: timeLeft < 30 ? 'var(--accent-rose)' : 'linear-gradient(to right, var(--primary), var(--accent-cyan))'
            }}
          ></div>
        </div>
      </div>

      {/* Main Grid: Questions Left, Sidebar Progress Right */}
      <div className="grid-3-1" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        
        {/* Left Side: Questions form list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-card" style={{ padding: '1.5rem 2rem' }}>
            <span style={{ fontSize: '0.8rem', background: 'var(--primary-glow)', border: '1px solid var(--primary)', padding: '0.2rem 0.55rem', borderRadius: '6px', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
              Active Exam Section
            </span>
            <h2 style={{ color: '#fff', fontSize: '1.6rem', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
              {section.name}
            </h2>
            {section.description && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>
                {section.description}
              </p>
            )}
          </div>

          {/* List of Questions */}
          {questions.map((q, qIndex) => {
            const chosenOptionIds = savedAnswers[q.id] || [];

            return (
              <div key={q.id} id={`question-card-${qIndex}`} className="glass-card" style={{ padding: '2rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                  Question {qIndex + 1}
                </span>
                
                <h3 style={{ color: '#fff', fontWeight: 500, fontSize: '1.25rem', marginTop: '0.25rem', marginBottom: '1.25rem' }}>
                  {q.text}
                </h3>

                {/* Question Image */}
                {q.image && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <img
                      src={getBlobImageSrc(q.image)}
                      alt="Question Diagram"
                      style={{
                        maxHeight: '350px',
                        maxWidth: '100%',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        border: '1px solid var(--glass-border)',
                        background: 'rgba(0,0,0,0.15)',
                        padding: '4px'
                      }}
                    />
                  </div>
                )}

                {/* Choices Inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {q.options.map((opt) => {
                    const isChecked = chosenOptionIds.includes(opt.id);
                    const wrapperClass = `option-wrapper${isChecked ? ' checked' : ''}`;
                    const inputType = q.questionType === 'single_select' ? 'radio' : 'checkbox';

                    return (
                      <label key={opt.id} className={wrapperClass}>
                        <input
                          type={inputType}
                          name={q.id}
                          checked={isChecked}
                          onChange={() => handleChoiceSelect(q.id, opt.id, q.questionType)}
                          disabled={submitting}
                        />
                        <span className="option-indicator"></span>
                        
                        {/* Display choice option contents */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start', width: '100%' }}>
                          {opt.image && (
                            <img
                              src={getBlobImageSrc(opt.image)}
                              alt="Choice Graphic"
                              style={{
                                maxHeight: '280px',
                                maxWidth: '100%',
                                objectFit: 'contain',
                                borderRadius: '6px',
                                border: '1px solid var(--glass-border)',
                                padding: '4px',
                                background: 'rgba(0,0,0,0.15)',
                                transition: 'transform 0.2s ease-in-out'
                              }}
                            />
                          )}
                          <span style={{ color: isChecked ? '#fff' : 'var(--text-primary)', fontWeight: '500' }}>
                            {opt.text}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Section Submission Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', marginBottom: '3rem' }}>
            <button
              onClick={handleManualSubmit}
              disabled={submitting}
              className="btn btn-primary"
              style={{ fontSize: '1.1rem', padding: '0.85rem 2.5rem' }}
            >
              {submitting ? 'Submitting sectionâ€¦' : <><span>Submit section &amp; continue</span><Icon name="chevronRight" size={17} /></>}
            </button>
          </div>

        </div>

        {/* Right Side: Sidebar Navigation progress */}
        <div className="glass-card" style={{ padding: '1.5rem', position: 'sticky', top: '2rem', height: 'fit-content' }}>
          <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
            Exam Progress
          </h3>

          {/* Current Active Section Attended vs Remaining Stats Box */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0.85rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>
              Active Section Status
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ background: 'color-mix(in srgb, var(--accent-green) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-green) 28%, transparent)', borderRadius: '8px', padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>{activeAnsweredCount}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: '600' }}><Icon name="check" size={13} /> Answered</div>
              </div>
              
              <div style={{ background: 'color-mix(in srgb, var(--accent-amber) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-amber) 28%, transparent)', borderRadius: '8px', padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-amber)' }}>{activeRemainingCount}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--accent-amber)', fontWeight: '600' }}><Icon name="clock" size={13} /> Remaining</div>
              </div>
            </div>

            {/* Question Palette Grid for Active Section */}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
              Question Palette (Click to jump):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
              {questions.map((q, idx) => {
                const isAnswered = savedAnswers[q.id] && savedAnswers[q.id].length > 0;
                return (
                  <button
                    key={q.id}
                    onClick={() => scrollToQuestion(idx)}
                    title={`Question ${idx + 1}: ${isAnswered ? 'Attended' : 'Remaining'}`}
                    style={{
                      padding: '0.35rem 0',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      border: isAnswered ? '1px solid var(--accent-green)' : '1px solid var(--glass-border)',
                      background: isAnswered ? 'var(--accent-green)' : 'rgba(255,255,255,0.05)',
                      color: isAnswered ? '#ffffff' : 'var(--text-muted)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {idx + 1}{isAnswered && <Icon name="check" size={12} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* All Sections Breakdown */}
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Sections Overview
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sectionsData.map((sec) => {
              let labelColor = 'var(--text-muted)';
              let borderCol = 'var(--glass-border)';
              let isCurrentActive = sec.status === 'active';
              
              const answered = isCurrentActive ? activeAnsweredCount : sec.answeredQuestions;
              const remaining = sec.totalQuestions - answered;

              if (isCurrentActive) {
                labelColor = '#fff';
                borderCol = 'var(--primary)';
              } else if (sec.status === 'completed') {
                labelColor = 'var(--accent-green)';
              }

              return (
                <div
                  key={sec.id}
                  style={{
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: borderCol,
                    background: isCurrentActive ? 'var(--glass-bg)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: labelColor }}>
                      {sec.name}
                    </span>
                    {sec.status === 'completed' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 'bold' }}>
                        <Icon name="check" size={13} /> Completed
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>Answered: <strong style={{ color: 'var(--accent-green)' }}>{answered}</strong></span>
                    <span>Remaining: <strong style={{ color: '#f59e0b' }}>{remaining}</strong></span>
                    <span>Total: {sec.totalQuestions}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem', lineHeight: '1.4' }}>
            Answers are auto-saved in real-time. Click any question number above to jump directly to it.
          </div>
        </div>

      </div>

    </div>
  );
}
