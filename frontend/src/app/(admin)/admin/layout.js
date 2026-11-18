import { cookies } from 'next/headers';
import { verifyToken } from '@frontend/lib/auth';
import AdminShell from '@/app/components/AdminShell';
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
  return (
    <AdminShell username={username} isSuperuser={session?.isSuperuser || false}>
      {children}
    </AdminShell>
  );
}
