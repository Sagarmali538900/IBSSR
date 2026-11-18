import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { verifyToken } from '@/auth';
import { ExamResult, ExamSession, ExamAssignment } from '@/models';
import { schemas } from '@/lib/schemas';

export async function GET(request) {
  const token = request.cookies.get('session')?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  await dbConnect();

  const url = new URL(request.url);
  const queryValidation = schemas.resultsQuery.safeParse({ q: url.searchParams.get('q') || '' });
  if (!queryValidation.success) return NextResponse.json({ message: queryValidation.error.issues[0]?.message }, { status: 400 });
  const search = queryValidation.data.q.trim().toLowerCase();
  let query = {};
  if (!session.isSuperuser) {
    const assignments = await ExamAssignment.find({ createdBy: session.userId }).select('_id');
    const sessions = await ExamSession.find({ assignmentId: { $in: assignments.map((item) => item._id) } }).select('_id');
    query = { sessionId: { $in: sessions.map((item) => item._id) } };
  }
  let results = await ExamResult.find(query).populate({ path: 'sessionId', populate: [{ path: 'candidateId' }, { path: 'examId' }, { path: 'assignmentId' }] }).sort({ completedAt: -1 });
  if (search) results = results.filter((result) => {
    const candidate = result.sessionId?.candidateId;
    const exam = result.sessionId?.examId;
    const assignment = result.sessionId?.assignmentId;
    return [candidate?.fullName, candidate?.email, exam?.title, assignment?.examCode].some((value) => value?.toLowerCase().includes(search));
  });
  return NextResponse.json({ results: results.map((result) => ({
    _id: result._id.toString(), overallScorePercentage: result.overallScorePercentage, completedAt: result.completedAt,
    sessionId: result.sessionId ? { id: result.sessionId._id.toString(), candidateId: result.sessionId.candidateId ? { fullName: result.sessionId.candidateId.fullName, email: result.sessionId.candidateId.email } : null, examId: result.sessionId.examId ? { title: result.sessionId.examId.title } : null, assignmentId: result.sessionId.assignmentId ? { examCode: result.sessionId.assignmentId.examCode } : null } : null,
  })) });
}
