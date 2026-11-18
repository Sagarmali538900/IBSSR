import { fetchBackendJson } from '@frontend/lib/backendFetch';

export default async function EmailLogsPage() {
  const data = await fetchBackendJson('/api/admin/email-logs');
  const logs = data?.logs || [];

  return (
    <div>
      <h1 style={{ fontSize: '2.2rem', marginBottom: '2rem' }}>Email Delivery Logs</h1>
      <div className="glass-card">
        <h3 style={{ marginBottom: '1.25rem', color: '#fff', fontSize: '1.3rem' }}>Dispatched Assessment Score Reports</h3>
        {logs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>No emails have been dispatched yet.</p>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead><tr><th>Recipient Candidate</th><th>Email Subject</th><th>Date &amp; Time Sent</th><th>Delivery Status</th></tr></thead>
              <tbody>{logs.map((log) => {
                const isSent = log.status.startsWith('Sent');
                return <tr key={log.id}>
                  <td><strong>{log.recipientEmail}</strong></td>
                  <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.subject}</td>
                  <td style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{new Date(log.sentAt).toLocaleString()}</td>
                  <td><span style={{ padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600', background: isSent ? 'color-mix(in srgb, var(--accent-green) 12%, transparent)' : 'color-mix(in srgb, var(--accent-rose) 12%, transparent)', border: `1px solid ${isSent ? 'var(--accent-green)' : 'var(--accent-rose)'}`, color: isSent ? 'var(--accent-green)' : 'var(--accent-rose)' }}>{log.status}</span></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
