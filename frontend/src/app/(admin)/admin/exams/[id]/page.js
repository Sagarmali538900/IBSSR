import { notFound } from 'next/navigation';
import { fetchBackend } from '@frontend/lib/backendFetch';
import ExamDetailClient from './ExamDetailClient';

export default async function ExamDetailPage({ params }) {
  const { id } = await params;
  const response = await fetchBackend(`/api/admin/exams/${id}?view=workspace`);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    if (response.status === 404 && errorBody?.message === 'Exam not found') notFound();
    const detail = errorBody?.message ? `: ${errorBody.message}` : '';
    throw new Error(`Unable to load assessment builder (backend returned ${response.status}${detail}).`);
  }
  const data = await response.json();
  const { exam: serializedExam, sections: serializedSections, questions: serializedQuestions, options: serializedOptions } = data;
  const canEdit = true;
  return (
    <ExamDetailClient
      exam={serializedExam}
      sections={serializedSections}
      questions={serializedQuestions}
      options={serializedOptions}
      canEdit={canEdit}
    />
  );
}
