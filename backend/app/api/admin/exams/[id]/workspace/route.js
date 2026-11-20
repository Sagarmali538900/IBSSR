import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { verifyToken } from '@/auth';
import { Exam, Section, Question, Option } from '@/models';
import { ids } from '@/lib/schemas';

export async function GET(request, { params }) {
  const { id } = await params;
  if (!ids.objectId.safeParse(id).success) return NextResponse.json({ message: 'Invalid assessment ID.' }, { status: 400 });
  const token = request.cookies.get('session')?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  const exam = await Exam.findById(id).populate('createdBy', 'username');
  if (!exam) return NextResponse.json({ message: 'Exam not found' }, { status: 404 });
  if (!session.isSuperuser && exam.createdBy?._id?.toString() !== session.userId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  const sections = await Section.find({ examId: id }).sort({ order: 1 });
  const questions = await Question.find({ sectionId: { $in: sections.map((item) => item._id) } }).sort({ order: 1 });
  const options = await Option.find({ questionId: { $in: questions.map((item) => item._id) } });
  return NextResponse.json({
    exam: { id: exam._id.toString(), title: exam.title, description: exam.description || '', createdById: exam.createdBy?._id?.toString(), createdByName: exam.createdBy?.username || 'System' },
    sections: sections.map((item) => ({ id: item._id.toString(), name: item.name, description: item.description || '', durationMinutes: item.durationMinutes, durationSeconds: item.durationSeconds, order: item.order })),
    questions: questions.map((item) => ({ id: item._id.toString(), sectionId: item.sectionId.toString(), text: item.text, image: item.image || null, questionType: item.questionType, estimatedTimeSeconds: item.estimatedTimeSeconds || 0, order: item.order })),
    options: options.map((item) => ({ id: item._id.toString(), questionId: item.questionId.toString(), text: item.text, image: item.image || null, score: item.score })),
  });
}
