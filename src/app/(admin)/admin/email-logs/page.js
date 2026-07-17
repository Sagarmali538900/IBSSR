import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { SentEmailLog, Candidate, ExamSession, ExamAssignment } from '@/lib/models';

export default async function EmailLogsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const session = token ? await verifyToken(token) : null;
  const userId = session?.userId;
  const isOwner = session?.isSuperuser || false;

  await dbConnect();

  let logs = [];

  if (isOwner) {
    logs = await SentEmailLog.find().sort({ sentAt: -1 });
  } else {
    // Franchise user - show logs associated with their candidates or assignments
    const userAssignments = await ExamAssignment.find({ createdBy: userId }).select('_id assignedEmail');
    const assignmentIds = userAssignments.map(a => a._id);
    const assignedEmails = userAssignments.map(a => a.assignedEmail);

    const userSessions = await ExamSession.find({ assignmentId: { $in: assignmentIds } }).select('_id');
    const sessionIds = userSessions.map(s => s._id);

    const candidateEmails = await ExamSession.distinct('candidateId', { _id: { $in: sessionIds } })
      .then(async (candidateIds) => {
        const candidates = await Candidate.find({ _id: { $in: candidateIds } }).select('email');
        return candidates.map(c => c.email);
      });

    const matchedEmails = [...new Set([...candidateEmails, ...assignedEmails])];

    logs = await SentEmailLog.find({ recipientEmail: { $in: matchedEmails } }).sort({ sentAt: -1 });
  }

  return (
    <div>
      <h1 style={{ fontSize: '2.2rem', marginBottom: '2rem' }}>Email Delivery Logs</h1>

      <div className="glass-card">
        <h3 style={{ marginBottom: '1.25rem', color: '#fff', fontSize: '1.3rem' }}>Dispatched Assessment Score Reports</h3>

        {logs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>
            No emails have been dispatched yet.
          </p>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Recipient Candidate</th>
                  <th>Email Subject</th>
                  <th>Date & Time Sent</th>
                  <th>Delivery Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const dateStr = new Date(log.sentAt).toLocaleString();
                  const isSent = log.status.startsWith('Sent');

                  return (
                    <tr key={log._id.toString()}>
                      <td>
                        <strong>{log.recipientEmail}</strong>
                      </td>
                      <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.subject}
                      </td>
                      <td style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{dateStr}</td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          background: isSent ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                          border: `1px solid ${isSent ? 'var(--accent-green)' : 'var(--accent-rose)'}`,
                          color: isSent ? '#34d399' : '#f87171'
                        }}>
                          {log.status}
                        </span>
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
