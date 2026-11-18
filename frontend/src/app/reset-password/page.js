import Link from 'next/link';
import ResetPasswordForm from './ResetPasswordForm';

export default async function ResetPasswordPage({ searchParams }) {
  const { token } = await searchParams;
  return (
    <div className="candidate-portal" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
      <main className="glass-card candidate-card" style={{ width: '100%', maxWidth: '480px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src="/ibssr-logo.png" alt="IBSSR" style={{ width: '58px', height: '58px', objectFit: 'contain', marginBottom: '0.5rem' }} />
          <h1 className="candidate-title" style={{ fontSize: '1.7rem', fontWeight: 750 }}>Choose a new password</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem' }}>Use at least 12 characters. Reset links expire after one hour.</p>
        </div>
        <ResetPasswordForm token={typeof token === 'string' ? token : ''} />
        <div style={{ textAlign: 'center', marginTop: '1.2rem' }}>
          <Link href="/login" style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 600 }}>Back to sign in</Link>
        </div>
      </main>
    </div>
  );
}
