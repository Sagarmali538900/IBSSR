import { notFound } from 'next/navigation';
import { fetchBackendJson } from '@frontend/lib/backendFetch';
import FranchisesClient from './FranchisesClient';

export default async function FranchisesPage() {
  const data = await fetchBackendJson('/api/admin/franchises');
  if (!data) notFound();
  return <FranchisesClient franchises={data.franchises || []} />;
}
