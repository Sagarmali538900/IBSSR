'use client';

import { useState } from 'react';
import Icon from '@/app/components/Icon';
import FieldError from '@/app/components/FieldError';
import { inputSchemas } from '@/lib/validation';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setRequestError('');
    const validation = inputSchemas.resetRequest.safeParse({ email });
    if (!validation.success) {
      setFieldError(validation.error.issues[0]?.message || 'Enter a valid email address.');
      return;
    }
    setFieldError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Password reset is unavailable right now. Try again later.');
      setMessage(data?.message || 'If an active account uses that email, reset instructions will be sent shortly.');
    } catch (requestError) {
      setRequestError(requestError.message || 'Could not request a reset link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="reset-email">Email address</label>
        <input id="reset-email" className="form-control" type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); if (fieldError) setFieldError(''); }} onBlur={() => { const result = inputSchemas.resetRequest.shape.email.safeParse(email); setFieldError(result.success ? '' : result.error.issues[0]?.message || 'Enter a valid email address.'); }} disabled={loading} placeholder="you@example.com" aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? 'reset-email-error' : undefined} />
        <FieldError id="reset-email-error" message={fieldError} />
      </div>
      {message && <p role="status" className="alert-success" style={{ padding: '0.8rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>{message}</p>}
      {requestError && <p role="alert" className="alert alert-error" style={{ marginBottom: '1rem' }}>{requestError}</p>}
      <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
        {loading ? 'Sending instructions…' : <>Send reset instructions <Icon name="mailOpen" size={17} /></>}
      </button>
    </form>
  );
}
