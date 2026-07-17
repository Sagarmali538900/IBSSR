'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ExamsClient({ exams }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const filteredExams = exams.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this exam? This will delete all sections, questions, choices, candidate responses, and results! This action CANNOT be undone.')) {
      return;
    }
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/exams/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Exam deleted successfully.');
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Error deleting exam: ${err.message}`);
      }
    } catch (error) {
      alert(`Error deleting exam: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '2.2rem' }}>Manage Exams</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/admin/exams/create" className="btn btn-primary">
            Create Exam
          </Link>
          <Link href="/admin/exams/import" className="btn btn-secondary">
            Import Exam (.json/.xlsx)
          </Link>
        </div>
      </div>

      {/* Local search filter */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem 2rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search exams by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-card">
        {filteredExams.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
            {search ? 'No exams match your search criteria.' : 'No exams created yet.'}
          </p>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Exam Title</th>
                  <th>Description</th>
                  <th>Created By</th>
                  <th>Date Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((exam) => (
                  <tr key={exam.id}>
                    <td>
                      <Link href={`/admin/exams/${exam.id}`} style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold' }}>
                        {exam.title}
                      </Link>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {exam.description || '(No description)'}
                    </td>
                    <td>{exam.createdByName}</td>
                    <td style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      {new Date(exam.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link href={`/admin/exams/${exam.id}`} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', backgroundColor: 'rgba(6,182,212,0.1)', borderColor: 'var(--accent-cyan)' }}>
                          View Builder
                        </Link>
                        <Link href={`/admin/exams/${exam.id}/edit`} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                          Edit Metadata
                        </Link>
                        <button
                          onClick={() => handleDelete(exam.id)}
                          className="btn btn-danger"
                          disabled={deletingId === exam.id}
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                        >
                          {deletingId === exam.id ? 'Deleting...' : 'Delete'}
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
  );
}
