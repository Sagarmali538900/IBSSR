'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getBlobImageSrc } from '@/lib/getBlobImageSrc';

export default function ExamRunClient({
  sessionId,
  section,
  questions,
  initialTimeLeft,
  initialSavedAnswers,
  sectionsData
}) {
  const router = useRouter();

  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const [savedAnswers, setSavedAnswers] = useState(initialSavedAnswers);
  const [submitting, setSubmitting] = useState(false);

  const timerRef = useRef(null);

  // 1. Countdown timer effect
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
    setSubmitting(true);
    try {
      const res = await fetch('/api/candidate/answers/submit-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, answers: savedAnswers })
      });

      if (res.ok) {
        const data = await res.json();
        router.push(data.nextUrl);
        router.refresh();
      } else {
        alert('Time expired. Auto-advancing section...');
        router.refresh();
      }
    } catch (err) {
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!confirm('Are you sure you want to submit this section? You will not be able to return to this section.')) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/candidate/answers/submit-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, answers: savedAnswers })
      });

      if (res.ok) {
        const data = await res.json();
        router.push(data.nextUrl);
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Error submitting section: ${err.message}`);
      }
    } catch (error) {
      alert(`Error submitting section: ${error.message}`);
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

    // Update local state
    const newAnswers = { ...savedAnswers, [questionId]: updatedSelection };
    setSavedAnswers(newAnswers);

    // Fire background save request
    try {
      await fetch('/api/candidate/answers/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId,
          optionIds: updatedSelection
        })
      });
    } catch (error) {
      console.warn('Background answer auto-save failed:', error);
    }
  };

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
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%', alignItems: 'flex-start' }}>
        
        {/* Left Side: Questions form list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-card" style={{ padding: '1.5rem 2rem' }}>
            <span style={{ fontSize: '0.75rem', background: 'var(--primary-glow)', border: '1px solid var(--primary)', padding: '0.15rem 0.5rem', borderRadius: '4px', color: '#d8b4fe', fontWeight: 700, textTransform: 'uppercase' }}>
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
              <div key={q.id} className="glass-card" style={{ padding: '2rem' }}>
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
              {submitting ? 'Submitting Section...' : 'Submit Section & Continue →'}
            </button>
          </div>

        </div>

        {/* Right Side: Sidebar Navigation progress */}
        <div className="glass-card" style={{ padding: '1.5rem', position: 'sticky', top: '2rem' }}>
          <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
            Exam Progress
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {sectionsData.map((sec) => {
              let labelColor = 'var(--text-muted)';
              let borderCol = 'var(--glass-border)';
              
              if (sec.status === 'active') {
                labelColor = '#fff';
                borderCol = 'var(--primary)';
              } else if (sec.status === 'completed') {
                labelColor = 'var(--accent-green)';
              }

              return (
                <div
                  key={sec.id}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: borderCol,
                    background: sec.status === 'active' ? 'var(--glass-bg)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: labelColor }}>
                      {sec.name}
                    </span>
                    {sec.status === 'completed' && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 'bold' }}>
                        ✓ Done
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Answered: <strong>{sec.answeredQuestions}</strong> / {sec.totalQuestions}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', lineHeight: '1.5' }}>
            Answers are auto-saved. The timer runs continuously until the section ends.
          </div>
        </div>

      </div>

    </div>
  );
}
