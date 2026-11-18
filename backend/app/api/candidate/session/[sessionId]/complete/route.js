import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { ExamSession, ExamResult, SectionResult } from '@/models';
import { calculateAndFinalizeResults, sendCandidateReportEmail } from '@/scoring';
import { ids } from '@/lib/schemas';

export async function GET(_request, { params }) {
  const { sessionId } = await params;
  if (!ids.objectId.safeParse(sessionId).success) return NextResponse.json({ message: 'Invalid session ID.' }, { status: 400 });
  await dbConnect();
  const session = await ExamSession.findById(sessionId).populate('candidateId examId');
  if (!session) return NextResponse.json({ message: 'Session not found' }, { status: 404 });
  let result = await ExamResult.findOne({ sessionId }).lean();
  if (!result) {
    try {
      const generated = await calculateAndFinalizeResults(sessionId);
      await sendCandidateReportEmail(sessionId, generated);
      result = await ExamResult.findOne({ sessionId }).lean();
    } catch (error) {
      console.error('Error generating results on the fly:', error);
    }
  }
  if (!result) return NextResponse.json({ message: 'Result not available' }, { status: 404 });
  const sectionResults = await SectionResult.find({ examResultId: result._id }).populate('sectionId').lean();
  return NextResponse.json({
    candidate: { fullName: session.candidateId?.fullName, email: session.candidateId?.email },
    exam: { title: session.examId?.title },
    result: { overallScorePercentage: result.overallScorePercentage },
    sectionResults: sectionResults.map((item) => ({ id: item._id.toString(), name: item.sectionId?.name || 'Unknown', scorePercentage: item.scorePercentage })),
  });
}
