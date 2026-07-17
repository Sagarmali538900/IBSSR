'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EditExamClient({ exam }) {
  const router = useRouter();
  const [title, setTitle] = useState(exam.title);
  const [description, setDescription] = useState(exam.description);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Title is required.');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/exams/${exam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });

      if (res.ok) {
        alert('Exam metadata updated successfully.');
        router.push('/admin/exams');
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (error) {
      alert(`Error updating exam: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/admin/exams" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
          &larr; Back to Exams
        </Link>
      </div>

      <h1 style={{ fontSize: '2.2rem', marginBottom: '2rem' }}>Edit Exam Metadata</h1>

      <div className="glass-card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Exam Title</label>
            <input
              type="text"
              id="title"
              className="form-control"
              placeholder="e.g. Cognitive Psychology Assessment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              className="form-control"
              rows={4}
              placeholder="Provide a brief summary of what this exam evaluates..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
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
