import Link from 'next/link';
import { fetchBackendJson } from '@frontend/lib/backendFetch';

export default async function ResultsPage({ searchParams }) {
  const { q } = await searchParams;
  const query = q ? q.trim() : '';
  const data = await fetchBackendJson(`/api/admin/results${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  const results = data?.results || [];

  return (
    <div>
      <h1 style={{ fontSize: '2.2rem', marginBottom: '2rem' }}>Candidate Assessment Results</h1>

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
          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>Search</button>
          {query && <Link href="/admin/results" className="btn btn-secondary">Reset</Link>}
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
                <tr><th>Candidate</th><th>Assessment</th><th>Exam Access Code</th><th>Date Completed</th><th>Overall Score</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {results.map((result) => {
                  const candidateName = result.sessionId?.candidateId?.fullName || 'N/A';
                  const candidateEmail = result.sessionId?.candidateId?.email || '';
                  const examTitle = result.sessionId?.examId?.title || 'N/A';
                  const examCode = result.sessionId?.assignmentId?.examCode || 'N/A';
                  return (
                    <tr key={result._id}>
                      <td><strong>{candidateName}</strong><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{candidateEmail}</div></td>
                      <td>{examTitle}</td>
                      <td><code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>{examCode}</code></td>
                      <td>{new Date(result.completedAt).toLocaleString()}</td>
                      <td><span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', fontSize: '1.25rem' }}>{result.overallScorePercentage}%</span></td>
                      <td><Link href={`/admin/results/${result._id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>View Scorecard</Link></td>
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
