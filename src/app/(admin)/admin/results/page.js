import { cookies } from 'next/headers';
import Link from 'next/link';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ExamResult, ExamSession, ExamAssignment, Candidate, Exam } from '@/lib/models';

export default async function ResultsPage({ searchParams }) {
  const { q } = await searchParams;
  const query = q ? q.trim() : '';

  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const session = token ? await verifyToken(token) : null;
  const userId = session?.userId;
  const isOwner = session?.isSuperuser || false;

  await dbConnect();

  let matchQuery = {};

  if (!isOwner) {
    // Franchise user - show only results assigned by this franchise
    const assignments = await ExamAssignment.find({ createdBy: userId }).select('_id');
    const assignmentIds = assignments.map(a => a._id);
    const sessions = await ExamSession.find({ assignmentId: { $in: assignmentIds } }).select('_id');
    const sessionIds = sessions.map(s => s._id);
    matchQuery.sessionId = { $in: sessionIds };
  }

  let results = await ExamResult.find(matchQuery)
    .populate({
      path: 'sessionId',
      populate: [
        { path: 'candidateId' },
        { path: 'examId' },
        { path: 'assignmentId' }
      ]
    })
    .sort({ completedAt: -1 });

  // Apply search query filter locally if q exists
  if (query) {
    const qLower = query.toLowerCase();
    results = results.filter((res) => {
      const name = res.sessionId?.candidateId?.fullName || '';
      const email = res.sessionId?.candidateId?.email || '';
      const examTitle = res.sessionId?.examId?.title || '';
      const code = res.sessionId?.assignmentId?.examCode || '';
      
      return (
        name.toLowerCase().includes(qLower) ||
        email.toLowerCase().includes(qLower) ||
        examTitle.toLowerCase().includes(qLower) ||
        code.toLowerCase().includes(qLower)
      );
    });
  }

  return (
    <div>
      <h1 style={{ fontSize: '2.2rem', marginBottom: '2rem' }}>Candidate Assessment Results</h1>

      {/* Search form */}
      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.25rem 2rem' }}>
        <form method="GET" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="form-group" style={{ flex: 1, margin: 0 }}>
            <input
              type="text"
              name="q"
              className="form-control"
              placeholder="Search candidate name, email, code, or exam..."
              defaultValue={query}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
            Search
          </button>
          {query && (
            <Link href="/admin/results" className="btn btn-secondary">
              Reset
            </Link>
          )}
        </form>
      </div>

      <div className="glass-card">
        {results.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>
            {query ? 'No results matched your search criteria.' : 'No assessment scores found.'}
          </p>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Assessment</th>
                  <th>Exam Access Code</th>
                  <th>Date Completed</th>
                  <th>Overall Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((res) => {
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
                        <code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>
                          {examCode}
                        </code>
                      </td>
                      <td>{dateStr}</td>
                      <td>
                        <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', fontSize: '1.25rem' }}>
                          {res.overallScorePercentage}%
                        </span>
                      </td>
                      <td>
                        <Link href={`/admin/results/${res._id.toString()}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
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
