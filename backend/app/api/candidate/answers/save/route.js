import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { CandidateAnswer, ExamSession, Option } from '@/models';
import { readValidatedJson } from '@/lib/validation';
import { schemas } from '@/lib/schemas';

export async function POST(request) {
  try {
    await dbConnect();
    const validation = await readValidatedJson(request, schemas.saveAnswer);
    if (!validation.success) return validation.response;
    const { sessionId, questionId, optionIds } = validation.data;

    const session = await ExamSession.findById(sessionId);
    if (!session) {
      return NextResponse.json({ message: 'Session not found.' }, { status: 404 });
    }

    if (session.status === 'completed') {
      return NextResponse.json({ message: 'Exam session already completed.' }, { status: 403 });
    }

    // Save or update answer
    let candidateAnswer = await CandidateAnswer.findOne({ sessionId, questionId });
    if (!candidateAnswer) {
      candidateAnswer = new CandidateAnswer({
        sessionId,
        questionId,
        selectedOptionIds: []
      });
    }

    // Validate option IDs belong to the question
    if (optionIds && optionIds.length > 0) {
      const validOptions = await Option.find({ _id: { $in: optionIds }, questionId });
      candidateAnswer.selectedOptionIds = validOptions.map(opt => opt._id);
    } else {
      candidateAnswer.selectedOptionIds = [];
    }

    candidateAnswer.answeredAt = new Date();
    await candidateAnswer.save();

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
