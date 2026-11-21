'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/app/components/Icon';
import FieldError from '@/app/components/FieldError';
import { getValidationErrors, inputSchemas } from '@/lib/validation';

export default function ResetPasswordForm({ token }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [requestError, setRequestError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setFieldErrors({});
    setRequestError('');
    if (!token) {
      setRequestError('This reset link is missing its token. Request a new link.');
      return;
    }
    if (password !== confirmation) {
      setFieldErrors({ confirmation: 'The passwords do not match.' });
      return;
    }
    const validation = inputSchemas.resetConfirm.safeParse({ token, password });
    if (!validation.success) {
      const nextErrors = getValidationErrors(validation);
      setFieldErrors(nextErrors);
      document.getElementById('new-password')?.focus();
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
      setRequestError(requestError.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="new-password">New password</label>
        <input id="new-password" className="form-control" type="password" autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); if (fieldErrors.password) setFieldErrors((current) => ({ ...current, password: '' })); }} disabled={loading} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'new-password-error' : undefined} />
        <FieldError id="new-password-error" message={fieldErrors.password} />
      </div>
      <div className="form-group">
        <label htmlFor="confirm-password">Confirm new password</label>
        <input id="confirm-password" className="form-control" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => { setConfirmation(event.target.value); if (fieldErrors.confirmation) setFieldErrors((current) => ({ ...current, confirmation: '' })); }} disabled={loading} aria-invalid={Boolean(fieldErrors.confirmation)} aria-describedby={fieldErrors.confirmation ? 'confirm-password-error' : undefined} />
        <FieldError id="confirm-password-error" message={fieldErrors.confirmation} />
      </div>
      {requestError && <p role="alert" className="alert alert-error" style={{ marginBottom: '1rem' }}>{requestError}</p>}
      <button className="btn btn-primary" type="submit" disabled={loading || !token} style={{ width: '100%' }}>
        {loading ? 'Updating password…' : <>Set new password <Icon name="lock" size={16} /></>}
      </button>
    </form>
  );
}
