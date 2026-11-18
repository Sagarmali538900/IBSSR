import { notFound } from 'next/navigation';
import { fetchBackendJson } from '@frontend/lib/backendFetch';
import ExamDetailClient from './ExamDetailClient';

export default async function ExamDetailPage({ params }) {
  const { id } = await params;
  const data = await fetchBackendJson(`/api/admin/exams/${id}/workspace`);
  if (!data) notFound();
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
