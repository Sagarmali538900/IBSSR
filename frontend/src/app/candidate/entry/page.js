'use client';

import { useAlerts } from '@/app/components/AlertProvider';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import '@/app/globals.css';
import FieldError from '@/app/components/FieldError';
import { getValidationErrors, inputSchemas } from '@/lib/validation';

export default function CandidateEntryPage() {
  const { notify } = useAlerts();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [examCode, setExamCode] = useState('');
  const [examTitle, setExamTitle] = useState('');
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [dob, setDob] = useState('');
  const [education, setEducation] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleValidateCode = async (e) => {
    e.preventDefault();
    const validation = inputSchemas.accessCode.safeParse({ examCode });
    if (!validation.success) {
      setFieldErrors(getValidationErrors(validation));
      return;
    }

    setLoading(true);
    setFieldErrors({});
    setServerError('');
    try {
      const res = await fetch('/api/candidate/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 1, ...validation.data })
      });

      if (res.ok) {
        const data = await res.json();
        setExamTitle(data.examTitle);
        setStep(2);
      } else {
        const err = await res.json();
        setServerError(err.message);
      }
    } catch (error) {
      setServerError(`Connection error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const validation = inputSchemas.candidateRegistration.safeParse({ examCode, fullName, email, mobileNumber, dob, education });
    if (!validation.success) {
      const nextErrors = getValidationErrors(validation);
      setFieldErrors(nextErrors);
      const firstInvalidField = ['fullName', 'email', 'mobileNumber', 'dob', 'education'].find((field) => nextErrors[field]);
      if (firstInvalidField) document.getElementById(firstInvalidField)?.focus();
      return;
    }

    setLoading(true);
    setFieldErrors({});
    setServerError('');
    try {
      const res = await fetch('/api/candidate/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 2, ...validation.data })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.resumed) {
          notify('Resuming your active examination session...');
        }
        router.push(`/candidate/instructions/${data.sessionId}`);
      } else {
        const err = await res.json();
        setServerError(err.message);
      }
    } catch (error) {
      setServerError(`Registration failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="candidate-portal" style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-card candidate-card" style={{ width: '100%', maxWidth: '500px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src="/ibssr-logo.png" 
            alt="IBSSR Logo" 
            style={{ width: '70px', height: '70px', objectFit: 'contain', marginBottom: '0.75rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' }}
          />
          <h1 className="candidate-title" style={{ fontSize: '1.8rem', fontWeight: '750' }}>
            IBSSR Assessment Portal
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Psychological & Cognitive Assessment Intake
          </p>
        </div>

        <div className="candidate-progress" aria-label={`Registration step ${step} of 2`}>
          <div className={step === 1 ? 'current' : 'complete'}><span>01</span><small>Verify access</small></div>
          <div className="progress-line" />
          <div className={step === 2 ? 'current' : ''}><span>02</span><small>Your details</small></div>
        </div>

        {serverError && (
          <div className="alert alert-error" style={{ fontSize: '0.9rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>{serverError}</span>
          </div>
        )}

        {step === 1 ? (
          <form noValidate onSubmit={handleValidateCode}>
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label htmlFor="exam-code">Exam Access Code</label>
              <input
                type="text"
                id="exam-code"
                className="form-control"
                placeholder="Enter access code (e.g. EXAM-XXXXXX)"
                value={examCode}
                onChange={(e) => {
                  setExamCode(e.target.value);
                  if (fieldErrors.examCode) setFieldErrors((current) => ({ ...current, examCode: '' }));
                }}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.examCode)}
                aria-describedby={fieldErrors.examCode ? 'exam-code-error' : undefined}
                style={{ textAlign: 'center', letterSpacing: '0.1em', fontSize: '1.1rem', fontWeight: 'bold' }}
              />
              <FieldError id="exam-code-error" message={fieldErrors.examCode} />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem', display: 'block', textAlign: 'center' }}>
                Please enter the 13-character code provided by your administrator.
              </small>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Validating Access Code...' : 'Verify Code & Proceed'}
            </button>
          </form>
        ) : (
          <form noValidate onSubmit={handleRegister}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                Verified Assessment
              </span>
              <h4 style={{ color: '#fff', fontSize: '1.05rem', marginTop: '0.15rem' }}>{examTitle}</h4>
            </div>

            <div className="form-group">
              <label htmlFor="fullname">Full Name</label>
              <input
                type="text"
                id="fullname"
                className="form-control"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName) setFieldErrors((current) => ({ ...current, fullName: '' }));
                }}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.fullName)}
                aria-describedby={fieldErrors.fullName ? 'full-name-error' : undefined}
              />
              <FieldError id="full-name-error" message={fieldErrors.fullName} />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                className="form-control"
                placeholder="Enter authorized email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((current) => ({ ...current, email: '' }));
                }}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'candidate-email-error' : undefined}
              />
              <FieldError id="candidate-email-error" message={fieldErrors.email} />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                Must match the email authorized by your administrator.
              </small>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="mobile">Mobile Number</label>
              <input
                type="tel"
                id="mobile"
                className="form-control"
                placeholder="Enter your contact number"
                value={mobileNumber}
                onChange={(e) => {
                  setMobileNumber(e.target.value);
                  if (fieldErrors.mobileNumber) setFieldErrors((current) => ({ ...current, mobileNumber: '' }));
                }}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.mobileNumber)}
                aria-describedby={fieldErrors.mobileNumber ? 'mobile-error' : undefined}
              />
              <FieldError id="mobile-error" message={fieldErrors.mobileNumber} />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="dob">Date of Birth</label>
              <input
                type="date"
                id="dob"
                className="form-control"
                value={dob}
                onChange={(e) => {
                  setDob(e.target.value);
                  if (fieldErrors.dob) setFieldErrors((current) => ({ ...current, dob: '' }));
                }}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.dob)}
                aria-describedby={fieldErrors.dob ? 'dob-error' : undefined}
              />
              <FieldError id="dob-error" message={fieldErrors.dob} />
            </div>

            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label htmlFor="education">Education / Standard</label>
              <input
                type="text"
                id="education"
                className="form-control"
                placeholder="e.g. 10th Standard, B.Sc, B.Tech, etc."
                value={education}
                onChange={(e) => {
                  setEducation(e.target.value);
                  if (fieldErrors.education) setFieldErrors((current) => ({ ...current, education: '' }));
                }}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.education)}
                aria-describedby={fieldErrors.education ? 'education-error' : undefined}
              />
              <FieldError id="education-error" message={fieldErrors.education} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
                {loading ? 'Starting Assessment...' : 'Start Assessment'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => {
                  setStep(1);
                  setFieldErrors({});
                  setServerError('');
                }}
                disabled={loading}
              >
                Back
              </button>
            </div>
          </form>
        )}

        <div style={{ borderTop: '1px solid var(--glass-border)', marginTop: '2rem', paddingTop: '1rem', textAlign: 'center' }}>
          <a href="/login" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none', transition: 'var(--transition)' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}>
            Are you an Administrator or Franchise? <strong style={{ color: 'var(--primary)' }}>Login here</strong>
          </a>
        </div>
      </div>
    </div>
  );
}
