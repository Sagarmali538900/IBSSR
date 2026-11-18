import { notFound } from 'next/navigation';
import { fetchBackendJson } from '@frontend/lib/backendFetch';
import EditExamClient from './EditExamClient';

export default async function EditExamPage({ params }) {
  const { id } = await params;
  const exam = await fetchBackendJson(`/api/admin/exams/${id}`);
  if (!exam) notFound();
  return <EditExamClient exam={{ id: exam._id, title: exam.title, description: exam.description || '' }} />;
}
