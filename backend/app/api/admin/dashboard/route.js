import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { verifyToken } from '@/auth';
import { Exam, Candidate, ExamSession, ExamResult, ExamAssignment } from '@/models';

export async function GET(request) {
  const token = request.cookies.get('session')?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const isOwner = Boolean(session.isSuperuser);
  const assignments = isOwner ? [] : await ExamAssignment.find({ createdBy: session.userId }).select('_id');
  const assignmentIds = assignments.map((item) => item._id);
  const sessions = isOwner ? [] : await ExamSession.find({ assignmentId: { $in: assignmentIds } }).select('_id');
  const sessionIds = sessions.map((item) => item._id);
  const sessionQuery = isOwner ? {} : { _id: { $in: sessionIds } };
  const resultQuery = isOwner ? {} : { sessionId: { $in: sessionIds } };
  const [totalExams, totalCandidates, totalSessions, completedSessions, resultStats, recentResults] = await Promise.all([
    Exam.countDocuments(isOwner ? {} : { createdBy: session.userId }),
    isOwner ? Candidate.countDocuments() : ExamSession.distinct('candidateId', { assignmentId: { $in: assignmentIds } }).then((ids) => ids.length),
    ExamSession.countDocuments(sessionQuery),
    ExamSession.countDocuments({ ...sessionQuery, status: 'completed' }),
    ExamResult.aggregate([{ $match: resultQuery }, { $group: { _id: null, avg: { $avg: '$overallScorePercentage' } } }]),
    ExamResult.find(resultQuery).populate({ path: 'sessionId', populate: [{ path: 'candidateId' }, { path: 'examId' }, { path: 'assignmentId' }] }).sort({ completedAt: -1 }).limit(5),
  ]);

  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);
  const monthly = await ExamSession.aggregate([
    { $match: { ...sessionQuery, status: 'completed', completedAt: { $gte: since } } },
    { $group: { _id: { year: { $year: '$completedAt' }, month: { $month: '$completedAt' } }, count: { $sum: 1 } } },
  ]);
  const monthlyData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return { label: date.toLocaleString('en', { month: 'short', year: 'numeric' }), count: monthly.find((item) => item._id.year === year && item._id.month === month)?.count || 0 };
  });
  const examAveragesRaw = await ExamResult.aggregate([
    { $match: resultQuery },
    { $lookup: { from: 'examsessions', localField: 'sessionId', foreignField: '_id', as: 'session' } }, { $unwind: '$session' },
    { $lookup: { from: 'exams', localField: 'session.examId', foreignField: '_id', as: 'exam' } }, { $unwind: '$exam' },
    { $group: { _id: '$exam._id', title: { $first: '$exam.title' }, avgScore: { $avg: '$overallScorePercentage' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } }, { $limit: 5 },
  ]);

  return NextResponse.json({
    isOwner,
    totalExams,
    totalCandidates,
    totalSessions,
    completedSessions,
    activeSessions: totalSessions - completedSessions,
    avgScore: Math.round((resultStats[0]?.avg || 0) * 10) / 10,
    monthlyData,
    examAverages: examAveragesRaw.map((item) => ({ _id: item._id.toString(), title: item.title, avgScore: item.avgScore || 0, count: item.count })),
    recentResults: recentResults.map((result) => {
      const item = result.toObject();
      item._id = result._id.toString();
      if (item.sessionId) {
        item.sessionId._id = item.sessionId._id?.toString();
        for (const key of ['candidateId', 'examId', 'assignmentId']) if (item.sessionId[key]?._id) item.sessionId[key]._id = item.sessionId[key]._id.toString();
      }
      return item;
    }),
  });
}
