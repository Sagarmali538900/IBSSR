import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Exam } from '@/lib/models';

export async function POST(request) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { title, description } = await request.json();

    if (!title) {
      return NextResponse.json({ message: 'Title is required' }, { status: 400 });
    }

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
