import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { verifyToken } from '@/auth';
import { Exam } from '@/models';
import { readValidatedJson } from '@/lib/validation';
import { schemas } from '@/lib/schemas';

export async function GET(request) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const query = session.isSuperuser ? {} : { createdBy: session.userId };
    const exams = await Exam.find(query).populate('createdBy', 'username').sort({ createdAt: -1 });
    return NextResponse.json({ exams: exams.map((exam) => ({
      id: exam._id.toString(),
      title: exam.title,
      description: exam.description || '',
      createdByName: exam.createdBy?.username || 'System',
      createdAt: exam.createdAt.toISOString(),
    })) });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const validation = await readValidatedJson(request, schemas.exam);
    if (!validation.success) return validation.response;
    const { title, description } = validation.data;

    const newExam = await Exam.create({
      title,
      description: description || '',
      createdBy: session.userId
    });

    return NextResponse.json({ success: true, examId: newExam._id.toString() });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
