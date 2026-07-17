import { cookies } from 'next/headers';
import Link from 'next/link';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Exam, Candidate, ExamSession, ExamResult, ExamAssignment } from '@/lib/models';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const session = token ? await verifyToken(token) : null;
  const userId = session?.userId;
  const isOwner = session?.isSuperuser || false;

  await dbConnect();

  let totalExams = 0;
  let totalCandidates = 0;
  let totalSessions = 0;
  let completedSessions = 0;
  let avgScore = 0.0;
  let recentResults = [];

  if (isOwner) {
    totalExams = await Exam.countDocuments();
    totalCandidates = await Candidate.countDocuments();
    totalSessions = await ExamSession.countDocuments();
    completedSessions = await ExamSession.countDocuments({ status: 'completed' });
    
    const resultStats = await ExamResult.aggregate([
      { $group: { _id: null, avg: { $avg: '$overallScorePercentage' } } }
    ]);
    avgScore = resultStats[0]?.avg || 0.0;

    recentResults = await ExamResult.find()
      .populate({
        path: 'sessionId',
        populate: [
          { path: 'candidateId' },
          { path: 'examId' },
          { path: 'assignmentId' }
        ]
      })
      .sort({ completedAt: -1 })
      .limit(5);
  } else {
    // Franchise user - filter stats by assignments created by this user
    totalExams = await Exam.countDocuments({ createdBy: userId });

    const assignments = await ExamAssignment.find({ createdBy: userId }).select('_id');
    const assignmentIds = assignments.map(a => a._id);

    totalCandidates = (await ExamSession.distinct('candidateId', { assignmentId: { $in: assignmentIds } })).length;
    totalSessions = await ExamSession.countDocuments({ assignmentId: { $in: assignmentIds } });
    completedSessions = await ExamSession.countDocuments({ assignmentId: { $in: assignmentIds }, status: 'completed' });

    const sessions = await ExamSession.find({ assignmentId: { $in: assignmentIds } }).select('_id');
    const sessionIds = sessions.map(s => s._id);

    const resultStats = await ExamResult.aggregate([
      { $match: { sessionId: { $in: sessionIds } } },
      { $group: { _id: null, avg: { $avg: '$overallScorePercentage' } } }
    ]);
    avgScore = resultStats[0]?.avg || 0.0;

    recentResults = await ExamResult.find({ sessionId: { $in: sessionIds } })
      .populate({
        path: 'sessionId',
        populate: [
          { path: 'candidateId' },
          { path: 'examId' },
          { path: 'assignmentId' }
        ]
      })
      .sort({ completedAt: -1 })
      .limit(5);
  }

  const activeSessions = totalSessions - completedSessions;
  avgScore = Math.round(avgScore * 10) / 10; // Round to 1 decimal place

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem' }}>Portal Dashboard</h1>
        <span className="alert-success" style={{ padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600 }}>
          {isOwner ? 'Administrator View' : 'Franchise Partner View'}
        </span>
      </div>

      {/* Metrics Cards Grid */}
      <div className="dashboard-grid">
        <div className="glass-card metric-card">
          <div className="metric-val">{totalExams}</div>
          <div className="metric-label">Total Exams</div>
        </div>
        <div className="glass-card metric-card">
          <div className="metric-val">{totalCandidates}</div>
          <div className="metric-label">Total Candidates</div>
        </div>
        <div className="glass-card metric-card">
          <div className="metric-val">{completedSessions}</div>
          <div className="metric-label">Completed Tests</div>
        </div>
        <div className="glass-card metric-card">
          <div className="metric-val">{activeSessions}</div>
          <div className="metric-label">Active Sessions</div>
        </div>
        <div className="glass-card metric-card">
          <div className="metric-val">{avgScore}%</div>
          <div className="metric-label">Average Score</div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="glass-card" style={{ marginTop: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Recent Candidate Results</span>
          <Link href="/admin/results" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
            View All
          </Link>
        </h2>

        {recentResults.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
            No assessments completed yet.
          </p>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Assessment</th>
                  <th>Exam Code</th>
                  <th>Date Completed</th>
                  <th>Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentResults.map((res) => {
                  const candidateName = res.sessionId?.candidateId?.fullName || 'N/A';
                  const candidateEmail = res.sessionId?.candidateId?.email || '';
                  const examTitle = res.sessionId?.examId?.title || 'N/A';
                  const examCode = res.sessionId?.assignmentId?.examCode || 'N/A';
                  const dateStr = new Date(res.completedAt).toLocaleString();

                  return (
                    <tr key={res._id.toString()}>
                      <td>
                        <strong>{candidateName}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{candidateEmail}</div>
                      </td>
                      <td>{examTitle}</td>
                      <td>
                        <code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                          {examCode}
                        </code>
                      </td>
                      <td>{dateStr}</td>
                      <td>
                        <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                          {res.overallScorePercentage}%
                        </span>
                      </td>
                      <td>
                        <Link href={`/admin/results/${res._id.toString()}`} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                          View Scorecard
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
