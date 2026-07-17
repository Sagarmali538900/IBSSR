import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ExamAssignment, Exam } from '@/lib/models';
import AssignmentsClient from './AssignmentsClient';

export default async function AssignmentsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const session = token ? await verifyToken(token) : null;
  const userId = session?.userId;
  const isOwner = session?.isSuperuser || false;

  await dbConnect();

  let assignments = [];
  let exams = [];

  if (isOwner) {
    assignments = await ExamAssignment.find()
      .populate('examId', 'title')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    exams = await Exam.find().sort({ title: 1 });
  } else {
    assignments = await ExamAssignment.find({ createdBy: userId })
      .populate('examId', 'title')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    exams = await Exam.find({ createdBy: userId }).sort({ title: 1 });
  }

  // Serialize Mongoose docs
  const serializedAssignments = assignments.map(a => ({
    id: a._id.toString(),
    examId: a.examId?._id?.toString() || '',
    examTitle: a.examId?.title || 'Deleted Exam',
    examCode: a.examCode,
    assignedEmail: a.assignedEmail,
    createdByName: a.createdBy?.username || 'System',
    createdAt: a.createdAt.toISOString()
  }));

  const serializedExams = exams.map(e => ({
    id: e._id.toString(),
    title: e.title
  }));

  return (
    <AssignmentsClient
      assignments={serializedAssignments}
      exams={serializedExams}
    />
  );
}
