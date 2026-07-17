import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Section, Exam } from '@/lib/models';

export async function POST(request, { params }) {
  try {
    const { id: examId } = await params;
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const exam = await Exam.findById(examId);
    if (!exam) {
      return NextResponse.json({ message: 'Exam not found' }, { status: 404 });
    }

    // Role check
    if (!session.isSuperuser && exam.createdBy?.toString() !== session.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { name, description, durationMinutes, durationSeconds, order } = await request.json();

    if (!name) {
      return NextResponse.json({ message: 'Section name is required.' }, { status: 400 });
    }

    const newSection = await Section.create({
      examId,
      name,
      description: description || '',
      durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : 10,
      durationSeconds: durationSeconds !== undefined ? Number(durationSeconds) : 0,
      order: order !== undefined ? Number(order) : 0
    });

    return NextResponse.json({ success: true, sectionId: newSection._id.toString() });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
