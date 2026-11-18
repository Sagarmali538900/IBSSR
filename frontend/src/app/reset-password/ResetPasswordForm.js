'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/app/components/Icon';
import { inputSchemas, validateInput } from '@/lib/validation';

export default function ResetPasswordForm({ token }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!token) {
      setError('This reset link is missing its token. Request a new link.');
      return;
    }
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    const validation = validateInput(inputSchemas.resetConfirm, { token, password });
    if (!validation.success) {
      setError(validation.message);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Password reset failed. Request a new link and try again.');
      router.replace('/login?passwordReset=success');
    } catch (requestError) {
      setError(requestError.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="new-password">New password</label>
        <input id="new-password" className="form-control" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} />
      </div>
      <div className="form-group">
        <label htmlFor="confirm-password">Confirm new password</label>
        <input id="confirm-password" className="form-control" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={loading} />
      </div>
      {error && <p role="alert" className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={loading || !token} style={{ width: '100%' }}>
        {loading ? 'Updating password…' : <>Set new password <Icon name="lock" size={16} /></>}
      </button>
    </form>
  );
}
