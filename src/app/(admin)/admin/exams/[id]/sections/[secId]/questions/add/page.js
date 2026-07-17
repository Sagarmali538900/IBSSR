'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AddQuestionPage({ params }) {
  const router = useRouter();
  const { id: examId, secId } = use(params);

  const [text, setText] = useState('');
  const [questionType, setQuestionType] = useState('single_select');
  const [order, setOrder] = useState(1);
  const [imageFile, setImageFile] = useState(null);

  // Initialize with 4 options by default, matching Django
  const [options, setOptions] = useState([
    { text: '', score: 0.0, imageFile: null },
    { text: '', score: 0.0, imageFile: null },
    { text: '', score: 0.0, imageFile: null },
    { text: '', score: 0.0, imageFile: null }
  ]);

  const [loading, setLoading] = useState(false);

  const handleOptionChange = (index, field, value) => {
    const updated = [...options];
    updated[index][field] = value;
    setOptions(updated);
  };

  const addOptionField = () => {
    setOptions([...options, { text: '', score: 0.0, imageFile: null }]);
  };

  const removeOptionField = (index) => {
    if (options.length <= 1) {
      alert('A question must have at least one option.');
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      alert('Question text is required.');
      return;
    }

    const filledOptions = options.filter(opt => opt.text.trim());
    if (filledOptions.length === 0) {
      alert('Please fill out at least one option choice.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('questionType', questionType);
      formData.append('order', order);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      filledOptions.forEach((opt, index) => {
        formData.append(`option_text_${index}`, opt.text);
        formData.append(`option_score_${index}`, opt.score);
        if (opt.imageFile) {
          formData.append(`option_image_${index}`, opt.imageFile);
        }
      });

      const res = await fetch(`/api/admin/sections/${secId}/questions`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        alert('Question and options added successfully.');
        router.push(`/admin/exams/${examId}`);
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (error) {
      alert(`Error adding question: ${error.message}`);
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

      <h1 style={{ fontSize: '2.2rem', marginBottom: '2.5rem' }}>Add Question</h1>

      <div className="glass-card">
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          
          <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: '#fff' }}>
            Question Core Metadata
          </h3>

          <div className="form-group">
            <label htmlFor="text">Question Text</label>
            <textarea
              id="text"
              className="form-control"
              rows={3}
              placeholder="e.g. Which of the following best describes your reaction under stress?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div className="form-group">
              <label htmlFor="questionType">Question Type</label>
              <select
                id="questionType"
                className="form-control"
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                disabled={loading}
              >
                <option value="single_select">Single Select (Radio Buttons)</option>
                <option value="multi_select">Multi-Select (Checkboxes)</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="order">Sorting Order</label>
              <input
                type="number"
                id="order"
                className="form-control"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '2.5rem' }}>
            <label htmlFor="image">Question Image (Optional)</label>
            <input
              type="file"
              id="image"
              accept="image/*"
              className="form-control"
              onChange={(e) => setImageFile(e.target.files[0] || null)}
              disabled={loading}
            />
          </div>

          <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Answer Options & Weightings</span>
            <button
              type="button"
              onClick={addOptionField}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
              disabled={loading}
            >
              + Add Choice Option
            </button>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {options.map((opt, index) => (
              <div key={index} style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>
                  #{index + 1}
                </span>

                <div className="form-group" style={{ flex: 3, minWidth: '200px', margin: 0 }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Option text choice"
                    value={opt.text}
                    onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="form-group" style={{ flex: 2, minWidth: '150px', margin: 0 }}>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-control"
                    title="Upload Option Image"
                    onChange={(e) => handleOptionChange(index, 'imageFile', e.target.files[0] || null)}
                    disabled={loading}
                  />
                </div>

                <div className="form-group" style={{ flex: 1, minWidth: '100px', margin: 0 }}>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    placeholder="Score"
                    value={opt.score}
                    onChange={(e) => handleOptionChange(index, 'score', e.target.value)}
                    disabled={loading}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeOptionField(index)}
                  className="btn btn-danger"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', height: '40px' }}
                  disabled={loading}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '3rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Add Question & Options'}
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
