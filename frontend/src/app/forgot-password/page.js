import Link from 'next/link';
import ForgotPasswordForm from './ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <div className="candidate-portal" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
      <main className="glass-card candidate-card" style={{ width: '100%', maxWidth: '480px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src="/ibssr-logo.png" alt="IBSSR" style={{ width: '58px', height: '58px', objectFit: 'contain', marginBottom: '0.5rem' }} />
          <h1 className="candidate-title" style={{ fontSize: '1.7rem', fontWeight: 750 }}>Reset your password</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem' }}>Enter the email address linked to your portal account.</p>
        </div>
        <ForgotPasswordForm />
        <div style={{ textAlign: 'center', marginTop: '1.2rem' }}>
          <Link href="/login" style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 600 }}>Back to sign in</Link>
        </div>
      </main>
    </div>
  );
}
