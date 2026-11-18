import { notFound } from 'next/navigation';
import { fetchBackendJson } from '@frontend/lib/backendFetch';
import '@/app/globals.css';

export default async function CompletedPage({ params }) {
  const { sessionId } = await params;
  const data = await fetchBackendJson(`/api/candidate/session/${sessionId}/complete`);
  if (!data) notFound();
  const { candidate, exam, result, sectionResults } = data;
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-card" style={{ maxWidth: '650px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img 
            src="/ibssr-logo.png" 
            alt="IBSSR Logo" 
            style={{ width: '70px', height: '70px', objectFit: 'contain', marginBottom: '0.5rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' }}
          />
          <h1 style={{ fontSize: '2.2rem', marginBottom: '0.25rem', marginTop: 0 }}>Assessment Completed</h1>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', textAlign: 'center' }}>
          Thank you, <strong>{candidate.fullName}</strong>, for completing the <strong>{exam.title}</strong> assessment.
        </p>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="result-score-circle">
            <div className="result-score-pct" style={{ color: 'var(--primary)' }}>{result.overallScorePercentage}%</div>
            <div className="result-score-label">Overall Score</div>
          </div>
        </div>

        <h3 style={{ marginBottom: '1.25rem' }}>Section Breakdown</h3>
        <div className="table-container" style={{ marginBottom: '2rem' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Section</th>
                <th>Score %</th>
              </tr>
            </thead>
            <tbody>
              {sectionResults.map((sr) => (
                <tr key={sr.id}>
                  <td>{sr.name}</td>
                  <td>{sr.scorePercentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <a 
            href={`/api/results/${sessionId}/pdf`} 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center', fontSize: '1rem' }}
          >
            Download PDF Report
          </a>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
          A copy of your PDF report has also been dispatched to <strong>{candidate.email}</strong>.
        </p>
      </div>
    </div>
  );
}
