'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AddSectionPage({ params }) {
  const router = useRouter();
  const { id: examId } = use(params);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [order, setOrder] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Section name is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/exams/${examId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          durationMinutes: Number(durationMinutes),
          durationSeconds: Number(durationSeconds),
          order: Number(order)
        })
      });

      if (res.ok) {
        alert('Section created successfully.');
        router.push(`/admin/exams/${examId}`);
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (error) {
      alert(`Error creating section: ${error.message}`);
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

      <h1 style={{ fontSize: '2.2rem', marginBottom: '2rem' }}>Add Section</h1>

      <div className="glass-card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Section Name</label>
            <input
              type="text"
              id="name"
              className="form-control"
              placeholder="e.g. Logical Reasoning"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Instructions / Description</label>
            <textarea
              id="description"
              className="form-control"
              rows={3}
              placeholder="Provide directions for this section..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label htmlFor="minutes">Duration (Minutes)</label>
              <input
                type="number"
                id="minutes"
                min={0}
                className="form-control"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="seconds">Duration (Seconds)</label>
              <input
                type="number"
                id="seconds"
                min={0}
                max={59}
                className="form-control"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="order">Sorting Order</label>
            <input
              type="number"
              id="order"
              className="form-control"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Section'}
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
