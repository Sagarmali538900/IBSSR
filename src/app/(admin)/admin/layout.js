import { cookies } from 'next/headers';
import Link from 'next/link';
import { verifyToken } from '@/lib/auth';
import '@/app/globals.css';

export const metadata = {
  title: 'IBSSR Administration Portal',
  description: 'Manage psychological assessments, candidate assignments, and analytics reports.',
};

export default async function AdminLayout({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const session = token ? await verifyToken(token) : null;

  const username = session?.username || 'Admin';
  const isSuperuser = session?.isSuperuser || false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <nav className="navbar">
        <Link href="/admin/dashboard" className="nav-brand">
          IBSSR Assessment Portal
        </Link>
        <ul className="nav-links">
          <li>
            <Link href="/admin/dashboard" className="nav-link">
              Dashboard
            </Link>
          </li>
          <li>
            <Link href="/admin/exams" className="nav-link">
              Exams
            </Link>
          </li>
          <li>
            <Link href="/admin/assignments" className="nav-link">
              Assignments
            </Link>
          </li>
          <li>
            <Link href="/admin/results" className="nav-link">
              Results
            </Link>
          </li>
          {isSuperuser && (
            <li>
              <Link href="/admin/franchises" className="nav-link">
                Franchises
              </Link>
            </li>
          )}
          <li>
            <Link href="/admin/email-logs" className="nav-link">
              Email Logs
            </Link>
          </li>
          <li style={{ marginLeft: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            User: <strong>{username}</strong>
          </li>
          <li>
            <a href="/api/auth/logout" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              Logout
            </a>
          </li>
        </ul>
      </nav>
      <main style={{ flex: 1, padding: '2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
