import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { ExamSession, Section, Question, Option, CandidateAnswer } from '@/lib/models';
import { calculateAndFinalizeResults, sendCandidateReportEmail } from '@/lib/scoring';

export async function POST(request) {
  try {
    await dbConnect();
    const { sessionId, answers } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ message: 'Session ID is required.' }, { status: 400 });
    }

    const session = await ExamSession.findById(sessionId);
    if (!session) {
      return NextResponse.json({ message: 'Session not found.' }, { status: 404 });
    }

    if (session.status === 'completed') {
      return NextResponse.json({ success: true, completed: true, nextUrl: `/candidate/completed/${sessionId}` });
    }

    // Save final answers sent in payload
    if (answers) {
      for (const [qId, optionIds] of Object.entries(answers)) {
        let candidateAnswer = await CandidateAnswer.findOne({ sessionId, questionId: qId });
        if (!candidateAnswer) {
          candidateAnswer = new CandidateAnswer({
            sessionId,
            questionId: qId,
            selectedOptionIds: []
          });
        }

        if (optionIds && optionIds.length > 0) {
          const validOptions = await Option.find({ _id: { $in: optionIds }, questionId: qId });
          candidateAnswer.selectedOptionIds = validOptions.map(opt => opt._id);
        } else {
          candidateAnswer.selectedOptionIds = [];
        }
        await candidateAnswer.save();
      }
    }

    // Find all sections of the exam
    const sections = await Section.find({ examId: session.examId }).sort({ order: 1 });
    const sectionIds = sections.map(s => s._id.toString());
    const currentIdx = sectionIds.indexOf(session.currentSectionId?.toString());

    if (currentIdx !== -1 && currentIdx + 1 < sections.length) {
      // Advance to next section
      session.currentSectionId = sections[currentIdx + 1]._id;
      session.sectionStartedAt = new Date();
      await session.save();

      return NextResponse.json({
        success: true,
        completed: false,
        nextUrl: `/candidate/exam-run/${sessionId}`
      });
    } else {
      // No more sections! Finalize exam
      session.status = 'completed';
      session.completedAt = new Date();
      session.currentSectionId = null;
      await session.save();

      // Calculate score & save results
      const resultObj = await calculateAndFinalizeResults(sessionId);
      
      // Dispatch Mock Email report
      await sendCandidateReportEmail(sessionId, resultObj);

      return NextResponse.json({
        success: true,
        completed: true,
        nextUrl: `/candidate/completed/${sessionId}`
      });
    }

  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
