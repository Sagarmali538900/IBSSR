'use client';

import { useAlerts } from '@/app/components/AlertProvider';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/app/components/Icon';
import FieldError from '@/app/components/FieldError';
import { getValidationErrors, inputSchemas } from '@/lib/validation';

export default function CreateExamPage() {
  const { notify } = useAlerts();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateField = (field, value) => {
    const result = inputSchemas.exam.shape[field].safeParse(value);
    setErrors((current) => ({ ...current, [field]: result.success ? '' : result.error.issues[0]?.message }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = inputSchemas.exam.safeParse({ title, description });
    if (!validation.success) {
      const nextErrors = getValidationErrors(validation);
      setErrors(nextErrors);
      const firstInvalidField = nextErrors.title ? 'title' : nextErrors.description ? 'description' : null;
      if (firstInvalidField) document.getElementById(firstInvalidField)?.focus();
      return;
    }
    setErrors({});
    
    setLoading(true);
    try {
      const res = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/admin/exams/${data.examId}`);
        router.refresh();
      } else {
        const err = await res.json();
        if (res.status === 409 && err.code === 'ASSESSMENT_TITLE_TAKEN') {
          setErrors((current) => ({ ...current, title: err.message }));
          document.getElementById('title')?.focus();
        } else {
          notify(`Error: ${err.message}`);
        }
      }
    } catch (error) {
      notify(`Error creating exam: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <Link
          href="/admin/exams"
          className="btn btn-secondary"
          aria-label="Back to exams"
          title="Back to exams"
          style={{ width: '40px', height: '40px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <Icon name="back" size={18} />
        </Link>
        <h1 style={{ fontSize: '2.2rem', margin: 0 }}>Create Exam</h1>
      </div>

      <div className="glass-card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="title">Exam Title</label>
            <input
              type="text"
              id="title"
              className="form-control"
              placeholder="e.g. Cognitive Psychology Assessment"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) validateField('title', e.target.value);
              }}
              onBlur={() => validateField('title', title)}
              disabled={loading}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'title-error' : undefined}
            />
            <FieldError id="title-error" message={errors.title} />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              className="form-control"
              rows={4}
              placeholder="Provide a brief summary of what this exam evaluates..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) validateField('description', e.target.value);
              }}
              onBlur={() => validateField('description', description)}
              disabled={loading}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? 'description-error' : undefined}
            />
            <FieldError id="description-error" message={errors.description} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create & Open Builder'}
            </button>
            <Link href="/admin/exams" className="btn btn-secondary" style={{ pointerEvents: loading ? 'none' : 'auto' }}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
