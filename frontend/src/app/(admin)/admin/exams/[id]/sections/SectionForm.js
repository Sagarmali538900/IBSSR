'use client';

import { useAlerts } from '@/app/components/AlertProvider';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FieldError from '@/app/components/FieldError';
import { getValidationErrors, inputSchemas } from '@/lib/validation';

export default function SectionForm({ examId, section = null }) {
  const { notify } = useAlerts();
  const router = useRouter();
  const isEditing = Boolean(section?.id);
  const [name, setName] = useState(section?.name || '');
  const [description, setDescription] = useState(section?.description || '');
  const [durationMinutes, setDurationMinutes] = useState(section?.durationMinutes ?? 10);
  const [durationSeconds, setDurationSeconds] = useState(section?.durationSeconds ?? 0);
  const [order, setOrder] = useState(section?.order ?? 0);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const totalDurationSeconds = Math.max(0, Number(durationMinutes || 0) * 60 + Number(durationSeconds || 0));

  const validateField = (field, value, values = {}) => {
    const data = {
      name,
      description,
      durationMinutes,
      durationSeconds,
      order,
      ...values,
      [field]: value,
    };
    const result = inputSchemas.section.safeParse(data);
    if (field === 'durationMinutes' || field === 'durationSeconds') {
      const durationIssues = result.success ? [] : result.error.issues;
      setErrors((current) => ({
        ...current,
        durationMinutes: durationIssues.find((issue) => issue.path[0] === 'durationMinutes')?.message || '',
        durationSeconds: durationIssues.find((issue) => issue.path[0] === 'durationSeconds')?.message || '',
      }));
      return;
    }
    const fieldError = result.success ? '' : result.error.issues.find((issue) => issue.path[0] === field)?.message || '';
    setErrors((current) => ({ ...current, [field]: fieldError }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = inputSchemas.section.safeParse({ name, description, durationMinutes, durationSeconds, order });
    if (!validation.success) {
      const nextErrors = getValidationErrors(validation);
      setErrors(nextErrors);
      const firstInvalidField = ['name', 'durationMinutes', 'durationSeconds', 'order'].find((field) => nextErrors[field]);
      if (firstInvalidField) {
        const inputId = firstInvalidField === 'durationMinutes' ? 'minutes' : firstInvalidField === 'durationSeconds' ? 'seconds' : firstInvalidField;
        document.getElementById(inputId)?.focus();
      }
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const endpoint = isEditing
        ? `/api/admin/sections/${section.id}`
        : `/api/admin/exams/${examId}/sections`;
      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });

      if (response.ok) {
        notify(`Section ${isEditing ? 'updated' : 'created'} successfully.`);
        router.push(`/admin/exams/${examId}`);
        router.refresh();
      } else {
        const error = await response.json();
        notify(`Error: ${error.message}`);
      }
    } catch (error) {
      notify(`Error ${isEditing ? 'updating' : 'creating'} section: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-form-page">
      <div className="section-form-heading">
        <Link href={`/admin/exams/${examId}`} className="section-back-link" aria-label="Back to builder" title="Back to builder">
        </Link>
        <h1>{isEditing ? 'Edit Section' : 'Add Section'}</h1>
      </div>

      <div className="glass-card section-form-card">
        <form noValidate onSubmit={handleSubmit}>
          <div className="section-form-top-fields">
            <div className="form-group">
              <label htmlFor="name">Section Name</label>
              <input
                type="text"
                id="name"
                className="form-control"
                placeholder="e.g. Logical Reasoning"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (errors.name) validateField('name', event.target.value);
                }}
                onBlur={() => validateField('name', name)}
                disabled={loading}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              <FieldError id="name-error" message={errors.name} />
            </div>

            <div className="form-group">
              <label htmlFor="order">Sorting Order</label>
              <input
                type="number"
                id="order"
                className="form-control"
                value={order}
                onChange={(event) => {
                  setOrder(event.target.value);
                  if (errors.order) validateField('order', event.target.value);
                }}
                onBlur={() => validateField('order', order)}
                disabled={loading}
                aria-invalid={Boolean(errors.order)}
                aria-describedby={errors.order ? 'order-error' : undefined}
              />
              <FieldError id="order-error" message={errors.order} />
            </div>
          </div>

          <div className="section-form-content-grid">
            <div className="form-group section-instructions-field">
              <label htmlFor="description">Instructions / Description</label>
              <textarea
                id="description"
                className="form-control"
                rows={3}
                placeholder="Provide directions for this section..."
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  if (errors.description) validateField('description', event.target.value);
                }}
                onBlur={() => validateField('description', description)}
                disabled={loading}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? 'description-error' : undefined}
              />
              <FieldError id="description-error" message={errors.description} />
            </div>

            <div className="section-duration-panel">
              <div className="section-duration-heading">
                <div>
                  <strong>Time limit</strong>
                  <span>Set the total time candidates get for this section.</span>
                </div>
                <div className="section-duration-total">
                  {Math.floor(totalDurationSeconds / 60)}<small>m</small> {totalDurationSeconds % 60}<small>s</small>
                </div>
              </div>
              <div className="section-duration-presets" aria-label="Quick duration choices">
                {[15, 30, 45, 60].map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    className={Number(durationMinutes) === minutes && Number(durationSeconds) === 0 ? 'is-selected' : ''}
                    onClick={() => { setDurationMinutes(minutes); setDurationSeconds(0); }}
                    disabled={loading}
                  >
                    {minutes} min
                  </button>
                ))}
              </div>
              <div className="section-duration-inputs">
                <div className="form-group">
                  <label htmlFor="minutes">Minutes</label>
                  <input
                    type="number"
                    id="minutes"
                    min={0}
                    className="form-control"
                    value={durationMinutes}
                    onChange={(event) => {
                      setDurationMinutes(event.target.value);
                      if (errors.durationMinutes) validateField('durationMinutes', event.target.value);
                    }}
                    onBlur={() => validateField('durationMinutes', durationMinutes)}
                    disabled={loading}
                    aria-invalid={Boolean(errors.durationMinutes)}
                    aria-describedby={errors.durationMinutes ? 'minutes-error' : undefined}
                  />
                  <FieldError id="minutes-error" message={errors.durationMinutes} />
                </div>
                <div className="form-group">
                  <label htmlFor="seconds">Seconds</label>
                  <input
                    type="number"
                    id="seconds"
                    min={0}
                    max={59}
                    className="form-control"
                    value={durationSeconds}
                    onChange={(event) => {
                      setDurationSeconds(event.target.value);
                      if (errors.durationSeconds || errors.durationMinutes) {
                        validateField('durationSeconds', event.target.value, { durationMinutes });
                      }
                    }}
                    onBlur={() => validateField('durationSeconds', durationSeconds)}
                    disabled={loading}
                    aria-invalid={Boolean(errors.durationSeconds)}
                    aria-describedby={errors.durationSeconds ? 'seconds-error' : undefined}
                  />
                  <FieldError id="seconds-error" message={errors.durationSeconds} />
                </div>
              </div>
            </div>
          </div>

          <div className="section-form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Section')}
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
