import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Exam, Section, Question, Option } from '@/lib/models';
import ExamDetailClient from './ExamDetailClient';

export default async function ExamDetailPage({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    notFound();
  }

  await dbConnect();

  const exam = await Exam.findById(id).populate('createdBy', 'username');
  if (!exam) {
    notFound();
  }

  const sections = await Section.find({ examId: id }).sort({ order: 1 });
  const sectionIds = sections.map(s => s._id);

  const questions = await Question.find({ sectionId: { $in: sectionIds } }).sort({ order: 1 });
  const questionIds = questions.map(q => q._id);

  const options = await Option.find({ questionId: { $in: questionIds } });

  // Serialize Mongoose docs to plain objects
  const serializedExam = {
    id: exam._id.toString(),
    title: exam.title,
    description: exam.description || '',
    createdById: exam.createdBy?._id?.toString(),
    createdByName: exam.createdBy?.username || 'System'
  };

  const serializedSections = sections.map(sec => ({
    id: sec._id.toString(),
    name: sec.name,
    description: sec.description || '',
    durationMinutes: sec.durationMinutes,
    durationSeconds: sec.durationSeconds,
    order: sec.order
  }));

  const serializedQuestions = questions.map(q => ({
    id: q._id.toString(),
    sectionId: q.sectionId.toString(),
    text: q.text,
    image: q.image || null,
    questionType: q.questionType,
    order: q.order
  }));

  const serializedOptions = options.map(opt => ({
    id: opt._id.toString(),
    questionId: opt.questionId.toString(),
    text: opt.text,
    image: opt.image || null,
    score: opt.score
  }));

  const canEdit = session.isSuperuser || serializedExam.createdById === session.userId;

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
