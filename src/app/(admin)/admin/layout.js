import { cookies } from 'next/headers';
import Link from 'next/link';
import { verifyToken } from '@/lib/auth';
import Navbar from '@/app/components/Navbar';
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
      <Navbar username={username} isSuperuser={isSuperuser} />
      <main style={{ flex: 1, padding: '2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
