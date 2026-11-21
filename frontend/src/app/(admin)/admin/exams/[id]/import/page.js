'use client';

import { useAlerts } from '@/app/components/AlertProvider';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { inputSchemas, validateInput } from '@/lib/validation';
import ExamImportTemplateLinks from '@/app/components/ExamImportTemplateLinks';
import FieldError from '@/app/components/FieldError';

export default function OverwriteImportPage({ params }) {
  const { notify, confirmAction } = useAlerts();
  const router = useRouter();
  const { id: examId } = use(params);

  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const validation = validateInput(inputSchemas.importFile, droppedFile);
      if (validation.success) {
        setFile(droppedFile);
        setFileError('');
      } else {
        setFile(null);
        setFileError(validation.message);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const validation = validateInput(inputSchemas.importFile, e.target.files[0]);
      if (validation.success) {
        setFile(e.target.files[0]);
        setFileError('');
      } else {
        setFile(null);
        setFileError(validation.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateInput(inputSchemas.importFile, file);
    if (!validation.success) {
      setFileError(validation.message);
      return;
    }
    setFileError('');

    if (!await confirmAction('Overwrite replaces the existing sections, questions, choices, candidate sessions, and results for this assessment.', { title: 'Replace assessment content?', confirmLabel: 'Overwrite assessment', tone: 'danger' })) {
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('examId', examId);

      const res = await fetch('/api/admin/exams/import', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        notify('Exam overwritten successfully!');
        router.push(`/admin/exams/${examId}`);
        router.refresh();
      } else {
        const err = await res.json();
        notify(`Overwrite Error: ${err.message}`);
      }
    } catch (error) {
      notify(`Import failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href={`/admin/exams/${examId}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
          &larr; Back to Builder
        </Link>
      </div>

      <h1 style={{ fontSize: '2.2rem', marginBottom: '1rem' }}>Overwrite & Import Exam</h1>
      
      <div className="alert alert-error" style={{ maxWidth: '600px', display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
        <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '1.5rem' }}></i>
        <div>
          <strong>CRITICAL WARNING:</strong> Overwriting will delete all current sections, questions, option choices, active candidate testing sessions, and score logs for this exam.
        </div>
      </div>

      <div className="glass-card" style={{ maxWidth: '600px' }}>
        <form noValidate onSubmit={handleSubmit}>
          <ExamImportTemplateLinks />

          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            style={{
              border: '2px dashed var(--glass-border)',
              borderRadius: '12px',
              padding: '3rem 2rem',
              textAlign: 'center',
              background: dragActive ? 'var(--primary-glow)' : 'rgba(0,0,0,0.035)',
              borderColor: dragActive ? 'var(--primary)' : 'var(--glass-border)',
              transition: 'var(--transition)',
              cursor: 'pointer',
              marginBottom: '2rem'
            }}
            onClick={() => document.getElementById('file-upload').click()}
          >
            <input
              type="file"
              id="file-upload"
              style={{ display: 'none' }}
              accept=".json,.xlsx"
              onChange={handleFileChange}
              disabled={loading}
            />
            
            <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '2.5rem', color: 'var(--text-muted)', marginBottom: '1rem' }}></i>
            
            {file ? (
              <div>
                <strong style={{ color: '#fff', fontSize: '1.1rem' }}>{file.name}</strong>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  ({Math.round(file.size / 1024)} KB) - Click to replace
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontWeight: 'bold', color: '#fff', margin: 0 }}>
                  Drag and drop JSON or Excel (.xlsx) file
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0 }}>
                  or click to browse · Excel files must use the exported template; legacy .xls is not supported
                </p>
              </div>
            )}
          </div>
          <FieldError id="import-file-error" message={fileError} />

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Overwriting Exam...' : 'Overwrite Existing Exam'}
            </button>
            <Link href={`/admin/exams/${examId}`} className="btn btn-secondary" style={{ pointerEvents: loading ? 'none' : 'auto' }}>
              Cancel
            </Link>
          </div>

        </form>
      </div>
    </div>
  );
}
