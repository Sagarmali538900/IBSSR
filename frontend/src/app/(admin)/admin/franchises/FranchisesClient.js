'use client';

import { useAlerts } from '@/app/components/AlertProvider';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputSchemas, validateInput } from '@/lib/validation';

export default function FranchisesClient({ franchises }) {
  const { notify, confirmAction } = useAlerts();
  const router = useRouter();

  // Create Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const registerButtonRef = useRef(null);

  // Toggle State
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    if (!isCreateOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsCreateOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      registerButtonRef.current?.focus();
    };
  }, [isCreateOpen]);

  const filteredFranchises = useMemo(() => {
    const query = search.trim().toLowerCase();
    return franchises.filter((franchise) => {
      const matchesQuery = !query || `${franchise.username} ${franchise.email}`.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? franchise.isActive : !franchise.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [franchises, search, statusFilter]);

  const activeCount = franchises.filter((franchise) => franchise.isActive).length;
  const inactiveCount = franchises.length - activeCount;

  const handleCreateFranchise = async (e) => {
    e.preventDefault();
    const validation = validateInput(inputSchemas.franchise, { username, email, password });
    if (!validation.success) {
      notify(validation.message, 'warning');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/franchises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data)
      });

      if (res.ok) {
        notify('Franchise partner created successfully!');
        setUsername('');
        setEmail('');
        setPassword('');
        setIsCreateOpen(false);
        router.refresh();
      } else {
        const err = await res.json();
        notify(`Error: ${err.message}`);
      }
    } catch (error) {
      notify(`Error creating franchise: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleFranchise = async (id, name, active) => {
    const action = active ? 'Deactivate' : 'Reactivate';
    if (!await confirmAction(`${action} access for ${name}?`, { title: `${action} partner access?`, confirmLabel: action, tone: active ? 'warning' : 'info' })) {
      return;
    }

    setTogglingId(id);
    try {
      const res = await fetch(`/api/admin/franchises/${id}/toggle`, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        notify(data.message);
        router.refresh();
      } else {
        const err = await res.json();
        notify(`Error: ${err.message}`);
      }
    } catch (error) {
      notify(`Error toggling status: ${error.message}`);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <main className="franchise-page">
      <header className="franchise-page-heading">
        <div>
          <span className="franchise-eyebrow">PARTNER MANAGEMENT</span>
          <h1>Franchise partners</h1>
          <p>Manage partner accounts and their access to the assessment portal.</p>
        </div>
        <button ref={registerButtonRef} type="button" className="franchise-register-button" onClick={() => setIsCreateOpen(true)}>
          Register franchise
        </button>
      </header>

      <section className="franchise-summary" aria-label="Partner account summary">
        <article><span>Total partners</span><strong>{franchises.length}</strong></article>
        <article><span>Active</span><strong>{activeCount}</strong></article>
        <article><span>Deactivated</span><strong>{inactiveCount}</strong></article>
      </section>

      <section className="franchise-directory" aria-labelledby="franchise-directory-title">
        <div className="franchise-directory-heading">
          <div>
            <span className="franchise-eyebrow">DIRECTORY</span>
            <h2 id="franchise-directory-title">All partners</h2>
          </div>
          <span className="franchise-result-count">{filteredFranchises.length} {filteredFranchises.length === 1 ? 'partner' : 'partners'}</span>
        </div>

        <div className="franchise-directory-tools">
          <label className="franchise-search-label" htmlFor="franchise-search">Search partners</label>
          <input
            id="franchise-search"
            className="franchise-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by username or email"
          />
          <div className="franchise-filters" aria-label="Filter partner status">
            {[
              { id: 'all', label: 'All', count: franchises.length },
              { id: 'active', label: 'Active', count: activeCount },
              { id: 'inactive', label: 'Deactivated', count: inactiveCount },
            ].map((filter) => (
              <button key={filter.id} type="button" className={statusFilter === filter.id ? 'is-active' : ''} aria-pressed={statusFilter === filter.id} onClick={() => setStatusFilter(filter.id)}>
                {filter.label}<span>{filter.count}</span>
              </button>
            ))}
          </div>
        </div>

        {filteredFranchises.length === 0 ? (
          <div className="franchise-empty-state">
            <strong>{franchises.length === 0 ? 'No franchise partners yet' : 'No partners match these filters'}</strong>
            <p>{franchises.length === 0 ? 'Register a partner to give them access to the portal.' : 'Try a different search or status filter.'}</p>
            {franchises.length === 0 && <button type="button" className="franchise-text-button" onClick={() => setIsCreateOpen(true)}>Register the first franchise</button>}
          </div>
        ) : (
          <div className="franchise-table-wrap">
            <table className="franchise-table">
              <thead><tr><th>Username</th><th>Email address</th><th>Date joined</th><th>Status</th><th>Account access</th></tr></thead>
              <tbody>
                {filteredFranchises.map((franchise) => (
                  <tr key={franchise.id}>
                    <td><strong className="franchise-username">{franchise.username}</strong></td>
                    <td><a className="franchise-email" href={`mailto:${franchise.email}`}>{franchise.email}</a></td>
                    <td className="franchise-date">{new Date(franchise.dateJoined).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td><span className={`franchise-status ${franchise.isActive ? 'is-active' : 'is-inactive'}`}>{franchise.isActive ? 'Active' : 'Deactivated'}</span></td>
                    <td>
                      <button type="button" onClick={() => handleToggleFranchise(franchise.id, franchise.username, franchise.isActive)} disabled={togglingId === franchise.id} className={`franchise-access-button ${franchise.isActive ? 'is-deactivate' : 'is-reactivate'}`}>
                        {togglingId === franchise.id ? 'Updating…' : franchise.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isCreateOpen && (
        <div className="franchise-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !creating) setIsCreateOpen(false); }}>
          <section className="franchise-modal" role="dialog" aria-modal="true" aria-labelledby="franchise-modal-title" aria-describedby="franchise-modal-description" onKeyDown={(event) => {
            if (event.key !== 'Tab') return;
            const focusable = event.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled)');
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}>
            <div className="franchise-modal-heading">
              <div>
                <span className="franchise-eyebrow">NEW PARTNER</span>
                <h2 id="franchise-modal-title">Register a franchise</h2>
                <p id="franchise-modal-description">Create a partner login for the assessment portal.</p>
              </div>
              <button type="button" className="franchise-modal-close" onClick={() => setIsCreateOpen(false)} disabled={creating} aria-label="Close registration dialog">Close</button>
            </div>

            <form className="franchise-form" onSubmit={handleCreateFranchise}>
              <label htmlFor="new-franchise-username">Franchise username</label>
              <input id="new-franchise-username" type="text" autoComplete="username" placeholder="e.g. franchise_south" value={username} onChange={(event) => setUsername(event.target.value)} disabled={creating} required maxLength={80} autoFocus />

              <label htmlFor="new-franchise-email">Email address</label>
              <input id="new-franchise-email" type="email" autoComplete="email" placeholder="branch@example.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={creating} required maxLength={254} />

              <label htmlFor="new-franchise-password">Temporary password</label>
              <input id="new-franchise-password" type="password" autoComplete="new-password" placeholder="At least 12 characters" value={password} onChange={(event) => setPassword(event.target.value)} disabled={creating} required minLength={12} maxLength={128} />
              <p className="franchise-form-help">Partner login details will be sent to this email address.</p>

              <div className="franchise-modal-actions">
                <button type="button" className="franchise-cancel-button" onClick={() => setIsCreateOpen(false)} disabled={creating}>Cancel</button>
                <button type="submit" className="franchise-register-button" disabled={creating}>{creating ? 'Creating account…' : 'Create partner account'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
