'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FranchisesClient({ franchises }) {
  const router = useRouter();

  // Create Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // Toggle State
  const [togglingId, setTogglingId] = useState(null);

  const handleCreateFranchise = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) {
      alert('All fields are required.');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/franchises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      if (res.ok) {
        alert('Franchise partner created successfully!');
        setUsername('');
        setEmail('');
        setPassword('');
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (error) {
      alert(`Error creating franchise: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleFranchise = async (id, name, active) => {
    const action = active ? 'disable/deactivate' : 'enable/reactivate';
    if (!confirm(`Are you sure you want to ${action} the franchise user '${name}'?`)) {
      return;
    }

    setTogglingId(id);
    try {
      const res = await fetch(`/api/admin/franchises/${id}/toggle`, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (error) {
      alert(`Error toggling status: ${error.message}`);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '2.2rem', marginBottom: '2rem' }}>Franchise Partners</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* Left Column: Franchises Table */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.25rem', color: '#fff', fontSize: '1.3rem' }}>Registered Franchises</h3>
          
          {franchises.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
              No franchise logs created yet. Use the creation form on the right.
            </p>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email Address</th>
                    <th>Date Joined</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {franchises.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <strong>{f.username}</strong>
                      </td>
                      <td>{f.email}</td>
                      <td style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        {new Date(f.dateJoined).toLocaleDateString()}
                      </td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          background: f.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                          border: `1px solid ${f.isActive ? 'var(--accent-green)' : 'var(--accent-rose)'}`,
                          color: f.isActive ? '#34d399' : '#f87171'
                        }}>
                          {f.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleFranchise(f.id, f.username, f.isActive)}
                          disabled={togglingId === f.id}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.8rem',
                            borderColor: f.isActive ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                            color: f.isActive ? '#f87171' : '#34d399'
                          }}
                        >
                          {togglingId === f.id ? 'Toggling...' : f.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Creation Panel */}
        <div className="glass-card">
          <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: '#fff', fontSize: '1.3rem' }}>
            Register New Franchise
          </h3>
          
          <form onSubmit={handleCreateFranchise}>
            <div className="form-group">
              <label htmlFor="username">Franchise Username</label>
              <input
                type="text"
                id="username"
                className="form-control"
                placeholder="e.g. franchise_south"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={creating}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                className="form-control"
                placeholder="e.g. branch@portal.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={creating}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Login Password</label>
              <input
                type="password"
                id="password"
                className="form-control"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={creating}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1.5rem' }}
              disabled={creating}
            >
              {creating ? 'Creating Partner Account...' : 'Register Franchise Account'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
