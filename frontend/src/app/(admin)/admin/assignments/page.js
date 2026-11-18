import { fetchBackendJson } from '@frontend/lib/backendFetch';
import AssignmentsClient from './AssignmentsClient';

export default async function AssignmentsPage() {
  const data = await fetchBackendJson('/api/admin/assignments');
  return (
    <AssignmentsClient
      assignments={data?.assignments || []}
      exams={data?.exams || []}
    />
  );
}
