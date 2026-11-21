'use client';

export default function ExamImportTemplateLinks() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
        padding: '1rem',
        marginBottom: '1.25rem',
        border: '1px solid var(--glass-border)',
        borderRadius: '10px',
        background: 'rgba(0,0,0,0.025)',
      }}
    >
      <div>
        <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Need a template?</strong>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Download a sample with the required assessment fields.
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <a
          href="/api/admin/exams/import?format=json"
          download="sample-exam-import.json"
          className="btn btn-secondary"
          style={{ padding: '0.55rem 0.8rem', fontSize: '0.85rem' }}
        >
          Sample JSON
        </a>
        <a
          href="/api/admin/exams/import?format=xlsx"
          download="sample-exam-import.xlsx"
          className="btn btn-secondary"
          style={{ padding: '0.55rem 0.8rem', fontSize: '0.85rem' }}
        >
          Sample Excel (.xlsx)
        </a>
      </div>
    </div>
  );
}
