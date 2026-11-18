import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { verifyToken } from '@/auth';
import { Section, Exam, Question, Option, CandidateAnswer } from '@/models';
import { readValidatedJson } from '@/lib/validation';
import { ids, schemas } from '@/lib/schemas';

export async function GET(request, { params }) {
  try {
    const { secId } = await params;
    if (!ids.objectId.safeParse(secId).success) return NextResponse.json({ message: 'Invalid section ID.' }, { status: 400 });
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const section = await Section.findById(secId).populate('examId');
    if (!section) {
      return NextResponse.json({ message: 'Section not found' }, { status: 404 });
    }

    // Role check
    if (!session.isSuperuser && section.examId?.createdBy?.toString() !== session.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(section);
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { secId } = await params;
    if (!ids.objectId.safeParse(secId).success) return NextResponse.json({ message: 'Invalid section ID.' }, { status: 400 });
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const section = await Section.findById(secId).populate('examId');
    if (!section) {
      return NextResponse.json({ message: 'Section not found' }, { status: 404 });
    }

    // Role check
    if (!session.isSuperuser && section.examId?.createdBy?.toString() !== session.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const validation = await readValidatedJson(request, schemas.section);
    if (!validation.success) return validation.response;
    const { name, description, durationMinutes, durationSeconds, order } = validation.data;

    section.name = name;
    section.description = description || '';
    section.durationMinutes = Number(durationMinutes);
    section.durationSeconds = Number(durationSeconds);
    section.order = Number(order);
    await section.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { secId } = await params;
    if (!ids.objectId.safeParse(secId).success) return NextResponse.json({ message: 'Invalid section ID.' }, { status: 400 });
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const section = await Section.findById(secId).populate('examId');
    if (!section) {
      return NextResponse.json({ message: 'Section not found' }, { status: 404 });
    }

    // Role check
    if (!session.isSuperuser && section.examId?.createdBy?.toString() !== session.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Cascading deletion
    const questions = await Question.find({ sectionId: secId }).select('_id');
    const questionIds = questions.map(q => q._id);

    // Delete options
    await Option.deleteMany({ questionId: { $in: questionIds } });

    // Delete candidate answers
    await CandidateAnswer.deleteMany({ questionId: { $in: questionIds } });

    // Delete questions
    await Question.deleteMany({ sectionId: secId });

    // Delete the section
    await Section.findByIdAndDelete(secId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
