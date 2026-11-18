import Link from 'next/link';
import { fetchBackendJson } from '@frontend/lib/backendFetch';
import DashboardCharts from './DashboardCharts';
import StorageWidget from '@/app/components/StorageWidget';
import Icon from '@/app/components/Icon';

export default async function DashboardPage() {
  const data = await fetchBackendJson('/api/admin/dashboard');
  if (!data) return <p>Dashboard data is unavailable. Confirm the backend is running.</p>;
  const { isOwner, totalExams, totalCandidates, totalSessions, completedSessions, activeSessions, avgScore, monthlyData, examAverages, recentResults } = data;
  return (
    <div>
      {/* Metrics Cards Grid */}
      <div className="dashboard-grid">
        <div className="glass-card metric-card">
          <span className="metric-icon"><Icon name="assessments" size={18} /></span>
          <div className="metric-val">{totalExams}</div>
          <div className="metric-label">Total Exams</div>
        </div>
        <div className="glass-card metric-card">
          <span className="metric-icon"><Icon name="partners" size={18} /></span>
          <div className="metric-val">{totalCandidates}</div>
          <div className="metric-label">Total Candidates</div>
        </div>
        <div className="glass-card metric-card">
          <span className="metric-icon"><Icon name="check" size={18} /></span>
          <div className="metric-val">{completedSessions}</div>
          <div className="metric-label">Completed Tests</div>
        </div>
        <div className="glass-card metric-card">
          <span className="metric-icon"><Icon name="clock" size={18} /></span>
          <div className="metric-val">{activeSessions}</div>
          <div className="metric-label">Active Sessions</div>
        </div>
        <div className="glass-card metric-card">
          <span className="metric-icon"><Icon name="results" size={18} /></span>
          <div className="metric-val">{avgScore}%</div>
          <div className="metric-label">Average Score</div>
        </div>
      </div>

      {/* Charts Section */}
      <DashboardCharts monthlyData={monthlyData} examAverages={examAverages} />

      {/* Recent Activity Table */}
      <div className="glass-card" style={{ marginTop: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Recent Candidate Results</span>
          <Link href="/admin/results" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
            View all results <Icon name="chevronRight" size={15} />
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
                          View scorecard <Icon name="open" size={14} />
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

      {isOwner && <StorageWidget />}
    </div>
  );
}
