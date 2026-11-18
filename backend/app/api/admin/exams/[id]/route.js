import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { verifyToken } from '@/auth';
import { Exam, Section, Question, Option, CandidateAnswer, ExamSession, ExamResult } from '@/models';
import { readValidatedJson } from '@/lib/validation';
import { ids, schemas } from '@/lib/schemas';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!ids.objectId.safeParse(id).success) return NextResponse.json({ message: 'Invalid assessment ID.' }, { status: 400 });
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const exam = await Exam.findById(id).populate('createdBy', 'username');
    if (!exam) {
      return NextResponse.json({ message: 'Exam not found' }, { status: 404 });
    }

    // Role check: Franchise can only view their own exams
    if (!session.isSuperuser && exam.createdBy?._id?.toString() !== session.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(exam);
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    if (!ids.objectId.safeParse(id).success) return NextResponse.json({ message: 'Invalid assessment ID.' }, { status: 400 });
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const exam = await Exam.findById(id);
    if (!exam) {
      return NextResponse.json({ message: 'Exam not found' }, { status: 404 });
    }

    // Role check
    if (!session.isSuperuser && exam.createdBy?.toString() !== session.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const validation = await readValidatedJson(request, schemas.exam);
    if (!validation.success) return validation.response;
    const { title, description } = validation.data;

    exam.title = title;
    exam.description = description || '';
    exam.updatedAt = new Date();
    await exam.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    if (!ids.objectId.safeParse(id).success) return NextResponse.json({ message: 'Invalid assessment ID.' }, { status: 400 });
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const exam = await Exam.findById(id);
    if (!exam) {
      return NextResponse.json({ message: 'Exam not found' }, { status: 404 });
    }

    // Role check
    if (!session.isSuperuser && exam.createdBy?.toString() !== session.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Cascading deletion
    const sections = await Section.find({ examId: id }).select('_id');
    const sectionIds = sections.map(s => s._id);

    const questions = await Question.find({ sectionId: { $in: sectionIds } }).select('_id');
    const questionIds = questions.map(q => q._id);

    // Delete options
    await Option.deleteMany({ questionId: { $in: questionIds } });

    // Delete candidate answers
    await CandidateAnswer.deleteMany({ questionId: { $in: questionIds } });

    // Delete questions
    await Question.deleteMany({ sectionId: { $in: sectionIds } });

    // Delete sections
    await Section.deleteMany({ examId: id });

    // Delete related candidate sessions & results
    const sessionsList = await ExamSession.find({ examId: id }).select('_id');
    const sessionIds = sessionsList.map(s => s._id);
    await ExamResult.deleteMany({ sessionId: { $in: sessionIds } });
    await ExamSession.deleteMany({ examId: id });

    // Finally, delete the exam
    await Exam.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
