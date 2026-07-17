import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Section, Exam, Question, Option, CandidateAnswer } from '@/lib/models';

export async function GET(request, { params }) {
  try {
    const { secId } = await params;
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

    const { name, description, durationMinutes, durationSeconds, order } = await request.json();
    if (!name) {
      return NextResponse.json({ message: 'Section name is required.' }, { status: 400 });
    }

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
