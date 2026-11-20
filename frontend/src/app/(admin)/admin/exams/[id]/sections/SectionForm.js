'use client';

import { useAlerts } from '@/app/components/AlertProvider';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { inputSchemas, validateInput } from '@/lib/validation';

export default function SectionForm({ examId, section = null }) {
  const { notify } = useAlerts();
  const router = useRouter();
  const isEditing = Boolean(section?.id);
  const [name, setName] = useState(section?.name || '');
  const [description, setDescription] = useState(section?.description || '');
  const [durationMinutes, setDurationMinutes] = useState(section?.durationMinutes ?? 10);
  const [durationSeconds, setDurationSeconds] = useState(section?.durationSeconds ?? 0);
  const [order, setOrder] = useState(section?.order ?? 0);
  const [loading, setLoading] = useState(false);
  const totalDurationSeconds = Math.max(0, Number(durationMinutes || 0) * 60 + Number(durationSeconds || 0));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateInput(inputSchemas.section, { name, description, durationMinutes, durationSeconds, order });
    if (!validation.success) {
      notify(validation.message, 'warning');
      return;
    }

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
                onChange={(event) => setName(event.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="order">Sorting Order</label>
              <input
                type="number"
                id="order"
                className="form-control"
                value={order}
                onChange={(event) => setOrder(event.target.value)}
                disabled={loading}
              />
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
                onChange={(event) => setDescription(event.target.value)}
                disabled={loading}
              />
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
                    onChange={(event) => setDurationMinutes(event.target.value)}
                    disabled={loading}
                  />
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
                    onChange={(event) => setDurationSeconds(event.target.value)}
                    disabled={loading}
                  />
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
