import { notFound } from 'next/navigation';
import { fetchBackendJson } from '@frontend/lib/backendFetch';
import EditQuestionClient from './EditQuestionClient';

export default async function EditQuestionPage({ params }) {
  const { id: examId, qId } = await params;
  const data = await fetchBackendJson(`/api/admin/questions/${qId}`);
  if (!data?.question) notFound();
  return <EditQuestionClient
    examId={examId}
    question={{
      id: data.question._id,
      sectionId: typeof data.question.sectionId === 'string' ? data.question.sectionId : data.question.sectionId?._id,
      text: data.question.text,
      image: data.question.image || null,
      questionType: data.question.questionType,
      estimatedTimeSeconds: data.question.estimatedTimeSeconds || 0,
      order: data.question.order,
    }}
    initialOptions={(data.options || []).map((option) => ({ id: option._id, text: option.text, image: option.image || null, score: option.score }))}
  />;
}
