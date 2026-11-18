import { fetchBackendJson } from '@frontend/lib/backendFetch';
import ExamsClient from './ExamsClient';

export default async function ExamsPage() {
  const data = await fetchBackendJson('/api/admin/exams');
  return <ExamsClient exams={data?.exams || []} />;
}
