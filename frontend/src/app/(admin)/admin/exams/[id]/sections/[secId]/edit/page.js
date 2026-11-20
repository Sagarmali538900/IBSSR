import { notFound } from 'next/navigation';
import { fetchBackendJson } from '@frontend/lib/backendFetch';
import SectionForm from '../../SectionForm';

export default async function EditSectionPage({ params }) {
  const { id: examId, secId } = await params;
  const section = await fetchBackendJson(`/api/admin/sections/${secId}`);
  if (!section) notFound();
  return <SectionForm examId={examId} section={{
    id: section._id.toString(),
    name: section.name,
    description: section.description || '',
    durationMinutes: section.durationMinutes,
    durationSeconds: section.durationSeconds,
    order: section.order,
  }} />;
}
