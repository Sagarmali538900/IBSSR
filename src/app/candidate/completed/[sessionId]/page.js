import { notFound } from 'next/navigation';
import dbConnect from '@/lib/db';
import { ExamSession, ExamResult, SectionResult, Section } from '@/lib/models';
import '@/app/globals.css';

export default async function CompletedPage({ params }) {
  const { sessionId } = await params;

  await dbConnect();

  const session = await ExamSession.findById(sessionId).populate('candidateId examId');
  if (!session) {
    notFound();
  }

  const result = await ExamResult.findOne({ sessionId }).lean();
  if (!result) {
    notFound();
  }

  const sectionResults = await SectionResult.find({ examResultId: result._id }).populate('sectionId').lean();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'radial-gradient(circle at 30% 30%, #0d0a1e, #03030a)' }}>
      <div className="glass-card" style={{ maxWidth: '600px', width: '100%' }}>
        <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '0.5rem' }}>Assessment Completed</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Thank you, <strong>{session.candidateId.fullName}</strong>, for completing the <strong>{session.examId.title}</strong> assessment.
        </p>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="result-score-circle">
            <div className="result-score-pct">{result.overallScorePercentage}%</div>
            <div className="result-score-label">Overall Score</div>
          </div>
        </div>

        <h3 style={{ color: '#fff', marginBottom: '1rem' }}>Section Breakdown</h3>
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
                <tr key={sr._id.toString()}>
                  <td>{sr.sectionId?.name || 'Unknown'}</td>
                  <td>{sr.scorePercentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          A detailed scorecard has been emailed to you. Please check your inbox for further instructions.
        </p>
      </div>
    </div>
  );
}
