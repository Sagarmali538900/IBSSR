import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { verifyToken } from '@/auth';
import { Section, Exam } from '@/models';
import { readValidatedJson } from '@/lib/validation';
import { ids, schemas } from '@/lib/schemas';

export async function POST(request, { params }) {
  try {
    const { id: examId } = await params;
    if (!ids.objectId.safeParse(examId).success) return NextResponse.json({ message: 'Invalid assessment ID.' }, { status: 400 });
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

    const validation = await readValidatedJson(request, schemas.section);
    if (!validation.success) return validation.response;
    const { name, description, durationMinutes, durationSeconds, order } = validation.data;

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
