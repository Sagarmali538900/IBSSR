import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { verifyToken } from '@/auth';
import { SentEmailLog, Candidate, ExamSession, ExamAssignment } from '@/models';

export async function GET(request) {
  const token = request.cookies.get('session')?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  await dbConnect();

  let query = {};
  if (!session.isSuperuser) {
    const assignments = await ExamAssignment.find({ createdBy: session.userId }).select('_id assignedEmail');
    const assignmentIds = assignments.map((item) => item._id);
    const emails = assignments.map((item) => item.assignedEmail);
    const sessions = await ExamSession.find({ assignmentId: { $in: assignmentIds } }).select('_id candidateId');
    const candidates = await Candidate.find({ _id: { $in: sessions.map((item) => item.candidateId) } }).select('email');
    query = { recipientEmail: { $in: [...new Set([...emails, ...candidates.map((item) => item.email)])] } };
  }

  const logs = await SentEmailLog.find(query).sort({ sentAt: -1 });
  return NextResponse.json({ logs: logs.map((log) => ({ id: log._id.toString(), recipientEmail: log.recipientEmail, subject: log.subject, sentAt: log.sentAt, status: log.status })) });
}
