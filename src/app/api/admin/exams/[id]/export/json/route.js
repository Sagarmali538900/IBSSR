import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Exam, Section, Question, Option } from '@/lib/models';

export async function GET(request, { params }) {
  try {
    const { id: examId } = await params;
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    await dbConnect();
    const exam = await Exam.findById(examId).populate('createdBy', 'username');
    if (!exam) {
      return new Response('Exam not found', { status: 404 });
    }

    // Role check
    if (!session.isSuperuser && exam.createdBy?._id?.toString() !== session.userId) {
      return new Response('Forbidden', { status: 403 });
    }

    const data = {
      title: exam.title,
      description: exam.description || '',
      sections: []
    };

    const sections = await Section.find({ examId }).sort({ order: 1 });
    for (const section of sections) {
      const secData = {
        name: section.name,
        description: section.description || '',
        duration_minutes: section.durationMinutes,
        duration_seconds: section.durationSeconds,
        order: section.order,
        questions: []
      };

      const questions = await Question.find({ sectionId: section._id }).sort({ order: 1 });
      for (const question of questions) {
        const qData = {
          text: question.text,
          question_type: question.questionType,
          order: question.order,
          image: question.image || null,
          options: []
        };

        const options = await Option.find({ questionId: question._id });
        for (const option of options) {
          qData.options.push({
            text: option.text,
            image: option.image || null,
            score: option.score
          });
        }

        secData.questions.push(qData);
      }

      data.sections.push(secData);
    }

    const jsonStr = JSON.stringify(data, null, 2);
    const filename = `${exam.title.trim().replace(/\s+/g, '_')}_exam.json`;

    return new Response(jsonStr, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    return new Response(error.message || 'Internal Server Error', { status: 500 });
  }
}
