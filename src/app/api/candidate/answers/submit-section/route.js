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

    // Save final answers sent in payload (Optimized with batch bulkWrite)
    if (answers && Object.keys(answers).length > 0) {
      const allOptionIds = Object.values(answers).flat().filter(Boolean);
      const validOptions = allOptionIds.length > 0
        ? await Option.find({ _id: { $in: allOptionIds } }).lean()
        : [];

      const validOptionMap = new Map();
      validOptions.forEach(opt => {
        const qIdStr = opt.questionId.toString();
        if (!validOptionMap.has(qIdStr)) validOptionMap.set(qIdStr, new Set());
        validOptionMap.get(qIdStr).add(opt._id.toString());
      });

      const bulkOps = Object.entries(answers).map(([qId, optionIds]) => {
        const validSet = validOptionMap.get(qId) || new Set();
        const finalOptionIds = (optionIds || []).filter(id => validSet.has(id));

        return {
          updateOne: {
            filter: { sessionId, questionId: qId },
            update: { $set: { selectedOptionIds: finalOptionIds, answeredAt: new Date() } },
            upsert: true
          }
        };
      });

      if (bulkOps.length > 0) {
        await CandidateAnswer.bulkWrite(bulkOps);
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

      // Dispatch Email report in background (Non-blocking response)
      sendCandidateReportEmail(sessionId, resultObj).catch(err => {
        console.error('Background report email dispatch error:', err);
      });

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
