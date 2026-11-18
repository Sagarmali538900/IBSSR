'use client';

import { useAlerts } from '@/app/components/AlertProvider';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/app/components/Icon';

export default function ExamsClient({ exams }) {
  const { notify, confirmAction } = useAlerts();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const query = search.trim().toLowerCase();
  const filteredExams = exams.filter((exam) =>
    `${exam.title || ''} ${exam.description || ''}`.toLowerCase().includes(query)
  );

  const handleDelete = async (id) => {
    if (!await confirmAction('This permanently deletes the assessment, its sections and questions, and all related candidate responses and results.', { title: 'Delete this assessment?', confirmLabel: 'Delete assessment', tone: 'danger' })) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/exams/${id}`, { method: 'DELETE' });
      if (response.ok) {
        notify('Exam deleted successfully.');
        router.refresh();
      } else {
        const error = await response.json();
        notify(`Error deleting exam: ${error.message}`);
      }
    } catch (error) {
      notify(`Error deleting exam: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="admin-page">
      <section className="admin-page-heading">
        <div>
          <span className="page-kicker">CONTENT MANAGEMENT</span>
          <h1>Assessments</h1>
          <p>Create, organize, and maintain the assessment library for your candidates.</p>
        </div>
        <div className="page-heading-actions">
          <Link href="/admin/exams/import" className="btn btn-secondary admin-secondary-action">
            <Icon name="upload" size={16} />
            Import
          </Link>
          <Link href="/admin/exams/create" className="btn btn-primary admin-primary-action">
            <Icon name="plus" size={16} />
            Create assessment
          </Link>
        </div>
      </section>

      <section className="assessment-workspace" aria-label="Assessment library">
        <div className="assessment-toolbar">
          <div className="assessment-toolbar-title">
            <div className="assessment-title-icon" aria-hidden="true">
              <Icon name="assessments" size={19} />
            </div>
            <div><h2>All assessments</h2><p>Search and manage your assessment content</p></div>
          </div>
          <span className="assessment-count"><strong>{filteredExams.length}</strong> {filteredExams.length === 1 ? 'assessment' : 'assessments'}</span>
        </div>

        <label className="assessment-search">
          <Icon name="search" size={17} />
          <input
            type="search"
            aria-label="Search assessments"
            placeholder="Search by title or description"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search">Clear</button>}
        </label>

        {filteredExams.length === 0 ? (
          <div className="assessment-empty-state">
            <div className="empty-state-icon" aria-hidden="true"><Icon name="search" size={22} /></div>
            <h3>{search ? 'No matching assessments' : 'Your assessment library is empty'}</h3>
            <p>{search ? 'Try a different title or description.' : 'Create your first assessment or import an existing one to get started.'}</p>
            {!search && <Link href="/admin/exams/create" className="btn btn-primary admin-primary-action">Create assessment</Link>}
          </div>
        ) : (
          <div className="assessment-table-wrap">
            <table className="custom-table assessment-table">
              <thead>
                <tr>
                  <th scope="col">Assessment</th>
                  <th scope="col">Description</th>
                  <th scope="col">Created by</th>
                  <th scope="col">Date created</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((exam) => (
                  <tr key={exam.id}>
                    <td data-label="Assessment">
                      <Link href={`/admin/exams/${exam.id}`} className="assessment-name">{exam.title}</Link>
                      <span className="assessment-type">Assessment</span>
                    </td>
                    <td data-label="Description" className="assessment-description">{exam.description || 'No description provided'}</td>
                    <td data-label="Created by"><span className="created-by"><span>{(exam.createdByName || 'S').slice(0, 1).toUpperCase()}</span>{exam.createdByName || 'System'}</span></td>
                    <td data-label="Date created" className="assessment-date">{exam.createdAt ? new Date(exam.createdAt).toLocaleDateString() : 'â€”'}</td>
                    <td data-label="Actions">
                      <div className="assessment-actions">
                        <Link href={`/admin/exams/${exam.id}`} className="assessment-action-link">Open builder <Icon name="open" size={14} /></Link>
                        <Link href={`/admin/exams/${exam.id}/edit`} className="assessment-icon-action" aria-label={`Edit ${exam.title}`} title="Edit metadata">
                          <Icon name="edit" size={15} />
                        </Link>
                        <button type="button" onClick={() => handleDelete(exam.id)} className="assessment-icon-action is-danger" disabled={deletingId === exam.id} aria-label={`Delete ${exam.title}`} title={deletingId === exam.id ? 'Deleting' : 'Delete assessment'}>
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
