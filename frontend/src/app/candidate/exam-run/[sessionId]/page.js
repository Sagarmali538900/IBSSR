import { notFound, redirect } from 'next/navigation';
import { fetchBackendJson } from '@frontend/lib/backendFetch';
import ExamRunClient from './ExamRunClient';

export default async function ExamRunPage({ params }) {
  const { sessionId } = await params;
  const data = await fetchBackendJson(`/api/candidate/session/${sessionId}/run`);
  if (!data) notFound();
  if (data.redirect === 'completed') redirect(`/candidate/completed/${sessionId}`);
  if (data.redirect === 'run') redirect(`/candidate/exam-run/${sessionId}`);
  return <ExamRunClient {...data} />;
}
