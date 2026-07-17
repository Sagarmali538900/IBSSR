'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import '@/app/globals.css';

export default function CandidateEntryPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [examCode, setExamCode] = useState('');
  const [examTitle, setExamTitle] = useState('');
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleValidateCode = async (e) => {
    e.preventDefault();
    if (!examCode.trim()) {
      setErrorMsg('Please enter an exam access code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/candidate/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 1, examCode })
      });

      if (res.ok) {
        const data = await res.json();
        setExamTitle(data.examTitle);
        setStep(2);
      } else {
        const err = await res.json();
        setErrorMsg(err.message);
      }
    } catch (error) {
      setErrorMsg(`Connection error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !mobileNumber.trim()) {
      setErrorMsg('All registration fields are required.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/candidate/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 2,
          examCode,
          fullName,
          email,
          mobileNumber
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.resumed) {
          alert('Resuming your active examination session...');
        }
        router.push(`/candidate/instructions/${data.sessionId}`);
      } else {
        const err = await res.json();
        setErrorMsg(err.message);
      }
    } catch (error) {
      setErrorMsg(`Registration failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '500px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '1.8rem',
            background: 'linear-gradient(135deg, #a78bfa, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: '800'
          }}>
            IBSSR Assessment Portal
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Psychological & Cognitive Assessment Intake
          </p>
        </div>

        {errorMsg && (
          <div className="alert alert-error" style={{ fontSize: '0.9rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>{errorMsg}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleValidateCode}>
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label htmlFor="exam-code">Exam Access Code</label>
              <input
                type="text"
                id="exam-code"
                className="form-control"
                placeholder="Enter access code (e.g. EXAM-XXXXXX)"
                value={examCode}
                onChange={(e) => setExamCode(e.target.value)}
                disabled={loading}
                required
                style={{ textAlign: 'center', letterSpacing: '0.1em', fontSize: '1.1rem', fontWeight: 'bold' }}
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem', display: 'block', textAlign: 'center' }}>
                Please enter the 13-character code provided by your administrator.
              </small>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Validating Access Code...' : 'Verify Code & Proceed'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
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
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                className="form-control"
                placeholder="Enter authorized email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                Must match the email authorized by your administrator.
              </small>
            </div>

            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label htmlFor="mobile">Mobile Number</label>
              <input
                type="tel"
                id="mobile"
                className="form-control"
                placeholder="Enter your contact number"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                disabled={loading}
                required
              />
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
                  setErrorMsg('');
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
