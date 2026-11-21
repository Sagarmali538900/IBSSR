import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { verifyToken } from '@/auth';
import { Exam } from '@/models';
import { readValidatedJson } from '@/lib/validation';
import { schemas } from '@/lib/schemas';
import { examTitleExists, EXAM_TITLE_TAKEN_MESSAGE, isExamTitleDuplicateError, normalizeExamTitle } from '@/lib/examTitle';

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

    if (await examTitleExists(title)) {
      return NextResponse.json({ code: 'ASSESSMENT_TITLE_TAKEN', field: 'title', message: EXAM_TITLE_TAKEN_MESSAGE }, { status: 409 });
    }

    const newExam = await Exam.create({
      title,
      titleKey: normalizeExamTitle(title),
      description: description || '',
      createdBy: session.userId
    });

    return NextResponse.json({ success: true, examId: newExam._id.toString() });
  } catch (error) {
    if (isExamTitleDuplicateError(error)) {
      return NextResponse.json({ code: 'ASSESSMENT_TITLE_TAKEN', field: 'title', message: EXAM_TITLE_TAKEN_MESSAGE }, { status: 409 });
    }
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
