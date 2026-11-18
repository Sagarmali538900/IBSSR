'use client';

import { useState } from 'react';
import Icon from '@/app/components/Icon';
import { inputSchemas, validateInput } from '@/lib/validation';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    const validation = validateInput(inputSchemas.resetRequest, { email });
    if (!validation.success) {
      setError(validation.message);
      return;
    }
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
      setError(requestError.message || 'Could not request a reset link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="reset-email">Email address</label>
        <input id="reset-email" className="form-control" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading} placeholder="you@example.com" />
      </div>
      {message && <p role="status" className="alert-success" style={{ padding: '0.8rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>{message}</p>}
      {error && <p role="alert" className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
        {loading ? 'Sending instructions…' : <>Send reset instructions <Icon name="mailOpen" size={17} /></>}
      </button>
    </form>
  );
}
