'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import '@/app/globals.css';
import Icon from '@/app/components/Icon';
import FieldError from '@/app/components/FieldError';
import { getValidationErrors, inputSchemas } from '@/lib/validation';

// Inner component that uses useSearchParams — must be wrapped in Suspense
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/admin/dashboard';
  const passwordResetComplete = searchParams.get('passwordReset') === 'success';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    const validation = inputSchemas.login.safeParse({ username, password });
    if (!validation.success) {
      const nextErrors = getValidationErrors(validation);
      setFieldErrors(nextErrors);
      const firstInvalidField = nextErrors.username ? 'username' : nextErrors.password ? 'password' : null;
      if (firstInvalidField) document.getElementById(firstInvalidField)?.focus();
      return;
    }
    setFieldErrors({});

    setLoading(true);
    setServerError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        router.push(nextUrl);
        router.refresh();
      } else {
        setServerError(data?.message || `The backend returned an unexpected response (HTTP ${res.status}). Confirm the backend is running on port 4001.`);
      }
    } catch (error) {
      setServerError(`Connection error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '450px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src="/ibssr-logo.png" 
            alt="IBSSR Logo" 
            style={{ width: '70px', height: '70px', objectFit: 'contain', marginBottom: '0.75rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' }}
          />
          <h1 style={{
            fontSize: '1.8rem',
            background: 'linear-gradient(135deg, var(--primary), var(--accent-cyan))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: '800'
          }}>
            IBSSR Admin Portal
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Administrative Control Panel Login
          </p>
        </div>

        {passwordResetComplete && (
          <div className="alert-success" role="status" style={{ padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
            Your password has been reset. Sign in with your new password.
          </div>
        )}

        {serverError && (
          <div className="alert alert-error" style={{ fontSize: '0.9rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span>{serverError}</span>
          </div>
        )}

        <form noValidate onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              className="form-control"
              placeholder="Enter username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) setFieldErrors((current) => ({ ...current, username: '' }));
              }}
              onBlur={() => {
                const result = inputSchemas.login.shape.username.safeParse(username);
                setFieldErrors((current) => ({ ...current, username: result.success ? '' : result.error.issues[0]?.message }));
              }}
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.username)}
              aria-describedby={fieldErrors.username ? 'username-error' : undefined}
            />
            <FieldError id="username-error" message={fieldErrors.username} />
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="form-control"
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((current) => ({ ...current, password: '' }));
              }}
              onBlur={() => {
                const result = inputSchemas.login.shape.password.safeParse(password);
                setFieldErrors((current) => ({ ...current, password: result.success ? '' : result.error.issues[0]?.message }));
              }}
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            <FieldError id="password-error" message={fieldErrors.password} />
            <div style={{ textAlign: 'right', marginTop: '0.55rem' }}>
              <a href="/forgot-password" style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>Forgot password?</a>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in…' : <>Sign in to dashboard <Icon name="login" size={17} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}

// Outer page wraps LoginForm in Suspense to satisfy Next.js production build
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
