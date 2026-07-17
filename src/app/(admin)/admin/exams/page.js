import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Exam } from '@/lib/models';
import ExamsClient from './ExamsClient';

export default async function ExamsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const session = token ? await verifyToken(token) : null;
  const userId = session?.userId;
  const isOwner = session?.isSuperuser || false;

  await dbConnect();

  let exams = [];
  if (isOwner) {
    exams = await Exam.find()
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });
  } else {
    exams = await Exam.find({ createdBy: userId })
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });
  }

  // Convert mongoose documents to plain serializable objects for Client Component
  const serializedExams = exams.map((exam) => ({
    id: exam._id.toString(),
    title: exam.title,
    description: exam.description || '',
    createdByName: exam.createdBy?.username || 'System',
    createdAt: exam.createdAt.toISOString()
  }));

  return <ExamsClient exams={serializedExams} />;
}
