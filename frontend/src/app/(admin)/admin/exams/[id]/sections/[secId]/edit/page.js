import { notFound } from 'next/navigation';
import { fetchBackendJson } from '@frontend/lib/backendFetch';
import EditSectionClient from './EditSectionClient';

export default async function EditSectionPage({ params }) {
  const { id: examId, secId } = await params;
  const section = await fetchBackendJson(`/api/admin/sections/${secId}`);
  if (!section) notFound();
  return <EditSectionClient examId={examId} section={{
    id: section._id,
    name: section.name,
    description: section.description || '',
    durationMinutes: section.durationMinutes,
    durationSeconds: section.durationSeconds,
    order: section.order,
  }} />;
}
