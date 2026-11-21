'use client';

import { useAlerts } from '@/app/components/AlertProvider';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FieldError from '@/app/components/FieldError';
import { getValidationErrors, inputSchemas } from '@/lib/validation';

export default function AssignmentsClient({ assignments, exams }) {
  const { notify, confirmAction } = useAlerts();
  const router = useRouter();

  // Search filter state
  const [search, setSearch] = useState('');

  // Batch Assign Form State
  const [examId, setExamId] = useState('');
  const [examCode, setExamCode] = useState('');
  const [emailsText, setEmailsText] = useState('');
  const [createErrors, setCreateErrors] = useState({});
  const [creating, setCreating] = useState(false);

  // Single Edit Form State
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editCode, setEditCode] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editErrors, setEditErrors] = useState({});
  const [updating, setUpdating] = useState(false);

  // Revoke state
  const [revokingId, setRevokingId] = useState(null);

  const filteredAssignments = assignments.filter(
    (a) =>
      a.assignedEmail.toLowerCase().includes(search.toLowerCase()) ||
      a.examCode.toLowerCase().includes(search.toLowerCase()) ||
      a.examTitle.toLowerCase().includes(search.toLowerCase())
  );

  const handleBatchAssign = async (e) => {
    e.preventDefault();
    const validation = inputSchemas.assignment.safeParse({ examId, examCode, emailsText });
    if (!validation.success) {
      setCreateErrors(getValidationErrors(validation));
      return;
    }
    setCreateErrors({});

    setCreating(true);
    try {
      const res = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data)
      });

      if (res.ok) {
        const data = await res.json();
        notify(data.message);
        setExamId('');
        setExamCode('');
        setEmailsText('');
        setCreateErrors({});
        router.refresh();
      } else {
        const err = await res.json();
        notify(`Error: ${err.message}`);
      }
    } catch (error) {
      notify(`Error creating assignments: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (a) => {
    setEditingAssignment(a);
    setEditCode(a.examCode);
    setEditEmail(a.assignedEmail);
    setEditErrors({});
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const validation = inputSchemas.assignmentEdit.safeParse({ examCode: editCode, assignedEmail: editEmail });
    if (!validation.success) {
      setEditErrors(getValidationErrors(validation));
      return;
    }
    setEditErrors({});

    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/assignments/${editingAssignment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data)
      });

      if (res.ok) {
        notify('Assignment updated successfully.');
        setEditingAssignment(null);
        router.refresh();
      } else {
        const err = await res.json();
        notify(`Error: ${err.message}`);
      }
    } catch (error) {
      notify(`Error updating assignment: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleRevoke = async (id, email, code) => {
    if (!await confirmAction(`Revoke access for ${email} using assignment code ${code}?`, { title: 'Revoke candidate access?', confirmLabel: 'Revoke access', tone: 'danger' })) {
      return;
    }

    setRevokingId(id);
    try {
      const res = await fetch(`/api/admin/assignments/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        notify('Access revoked successfully.');
        router.refresh();
      } else {
        const err = await res.json();
        notify(`Error revoking access: ${err.message}`);
      }
    } catch (error) {
      notify(`Error: ${error.message}`);
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '2.2rem', marginBottom: '2rem' }}>Candidate Assignments</h1>

      <div className="grid-2-1">
        
        {/* Left Column: Active codes table */}
        <div>
          {/* Local Search */}
          <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem 2rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search assignments by email, code, or exam title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="glass-card">
            <h3 style={{ marginBottom: '1rem', color: '#fff', fontSize: '1.3rem' }}>Active Exam Access Codes</h3>
            
            {filteredAssignments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                {search ? 'No assignments match your search.' : 'No access codes assigned yet.'}
              </p>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Exam Code</th>
                      <th>Candidate Email</th>
                      <th>Assessment</th>
                      <th>Created By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignments.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                            {a.examCode}
                          </code>
                        </td>
                        <td>{a.assignedEmail}</td>
                        <td>{a.examTitle}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{a.createdByName}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleStartEdit(a)}
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleRevoke(a.id, a.assignedEmail, a.examCode)}
                              disabled={revokingId === a.id}
                              className="btn btn-danger"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                            >
                              {revokingId === a.id ? 'Revoking...' : 'Revoke'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Creation Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-card">
            <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: '#fff', fontSize: '1.3rem' }}>
              Assign Access Code
            </h3>
            
            {exams.length === 0 ? (
              <p style={{ color: 'var(--accent-rose)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                You must create or possess at least one exam to assign access.
              </p>
            ) : (
              <form noValidate onSubmit={handleBatchAssign}>
                
                <div className="form-group">
                  <label htmlFor="exam">Select Assessment</label>
                  <select
                    id="exam"
                    className="form-control"
                    value={examId}
                    onChange={(e) => {
                      setExamId(e.target.value);
                      if (createErrors.examId) setCreateErrors((current) => ({ ...current, examId: '' }));
                    }}
                    disabled={creating}
                    aria-invalid={Boolean(createErrors.examId)}
                    aria-describedby={createErrors.examId ? 'exam-error' : undefined}
                  >
                    <option value="">-- Choose Exam --</option>
                    {exams.map(e => (
                      <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                  </select>
                  <FieldError id="exam-error" message={createErrors.examId} />
                </div>

                <div className="form-group">
                  <label htmlFor="code">Access Code (Optional)</label>
                  <input
                    type="text"
                    id="code"
                    className="form-control"
                    placeholder="Leave blank to auto-generate"
                    value={examCode}
                    onChange={(e) => {
                      setExamCode(e.target.value);
                      if (createErrors.examCode) setCreateErrors((current) => ({ ...current, examCode: '' }));
                    }}
                    disabled={creating}
                    aria-invalid={Boolean(createErrors.examCode)}
                    aria-describedby={createErrors.examCode ? 'code-error' : undefined}
                  />
                  <FieldError id="code-error" message={createErrors.examCode} />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Codes are normalized to uppercase.
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="emails">Authorized Candidate Emails</label>
                  <textarea
                    id="emails"
                    className="form-control"
                    rows={5}
                    placeholder="Enter emails (one per line or separated by commas)"
                    value={emailsText}
                    onChange={(e) => {
                      setEmailsText(e.target.value);
                      if (createErrors.emailsText) setCreateErrors((current) => ({ ...current, emailsText: '' }));
                    }}
                    disabled={creating}
                    aria-invalid={Boolean(createErrors.emailsText)}
                    aria-describedby={createErrors.emailsText ? 'emails-error' : undefined}
                  />
                  <FieldError id="emails-error" message={createErrors.emailsText} />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '1.5rem' }}
                  disabled={creating}
                >
                  {creating ? 'Assigning Access...' : 'Generate & Assign Access'}
                </button>

              </form>
            )}
          </div>
        </div>

      </div>

      {/* Edit Assignment Modal */}
      {editingAssignment && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: '#fff' }}>
              Reassign Access
            </h3>
            
            <form noValidate onSubmit={handleUpdate}>
              <div className="form-group">
                <label htmlFor="edit-assignment-code">Access Code</label>
                <input
                  id="edit-assignment-code"
                  type="text"
                  className="form-control"
                  value={editCode}
                  onChange={(e) => {
                    setEditCode(e.target.value);
                    if (editErrors.examCode) setEditErrors((current) => ({ ...current, examCode: '' }));
                  }}
                  disabled={updating}
                  aria-invalid={Boolean(editErrors.examCode)}
                  aria-describedby={editErrors.examCode ? 'edit-code-error' : undefined}
                />
                <FieldError id="edit-code-error" message={editErrors.examCode} />
              </div>

              <div className="form-group">
                <label htmlFor="edit-assignment-email">Candidate Email</label>
                <input
                  id="edit-assignment-email"
                  type="email"
                  className="form-control"
                  value={editEmail}
                  onChange={(e) => {
                    setEditEmail(e.target.value);
                    if (editErrors.assignedEmail) setEditErrors((current) => ({ ...current, assignedEmail: '' }));
                  }}
                  disabled={updating}
                  aria-invalid={Boolean(editErrors.assignedEmail)}
                  aria-describedby={editErrors.assignedEmail ? 'edit-email-error' : undefined}
                />
                <FieldError id="edit-email-error" message={editErrors.assignedEmail} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={updating}>
                  {updating ? 'Updating...' : 'Save Updates'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setEditingAssignment(null)}
                  disabled={updating}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
