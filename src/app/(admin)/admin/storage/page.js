'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function StoragePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('mongo'); // 'mongo' | 'blob'

  // Selection states for MongoDB collections
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [cleanupDays, setCleanupDays] = useState('30');
  const [isDeletingMongo, setIsDeletingMongo] = useState(false);

  // Selection states for Vercel Blob files
  const [selectedBlobUrls, setSelectedBlobUrls] = useState([]);
  const [isDeletingBlob, setIsDeletingBlob] = useState(false);

  // Status/Alert Message
  const [actionMessage, setActionMessage] = useState(null);

  const fetchStorageData = async () => {
    try {
      setError(null);
      const res = await fetch('/api/admin/storage/status');
      if (res.status === 403) {
        throw new Error('Forbidden: Only Administrators (Superusers) can access Storage Management.');
      }
      if (!res.ok) throw new Error('Failed to load storage status.');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageData();
  }, []);

  // MongoDB Collection Selection Handlers
  const toggleSelectCollection = (name) => {
    setSelectedCollections(prev => 
      prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]
    );
  };

  const toggleSelectAllCollections = () => {
    if (!data?.mongo?.collections) return;
    if (selectedCollections.length === data.mongo.collections.length) {
      setSelectedCollections([]);
    } else {
      setSelectedCollections(data.mongo.collections.map(c => c.name));
    }
  };

  // Blob File Selection Handlers
  const toggleSelectBlob = (url) => {
    setSelectedBlobUrls(prev => 
      prev.includes(url) ? prev.filter(item => item !== url) : [...prev, url]
    );
  };

  const toggleSelectAllBlobs = () => {
    if (!data?.blob?.files) return;
    if (selectedBlobUrls.length === data.blob.files.length) {
      setSelectedBlobUrls([]);
    } else {
      setSelectedBlobUrls(data.blob.files.map(f => f.url));
    }
  };

  // Export Handlers
  const handleExportDatabase = (type) => {
    let url = '/api/admin/storage/export?type=' + type;
    if (type === 'collections' && selectedCollections.length > 0) {
      url += '&names=' + encodeURIComponent(selectedCollections.join(','));
    } else if (type === 'blob_manifest' && selectedBlobUrls.length > 0) {
      url += '&urls=' + encodeURIComponent(selectedBlobUrls.join(','));
    }
    window.open(url, '_blank');
  };

  // Cleanup Handlers
  const handleCleanupCollections = async () => {
    if (selectedCollections.length === 0) {
      alert('Please select at least one collection to clean up.');
      return;
    }

    const confirmText = Number(cleanupDays) > 0 
      ? `Are you sure you want to delete documents older than ${cleanupDays} days from selected collection(s): ${selectedCollections.join(', ')}?`
      : `WARNING: Are you sure you want to delete ALL documents from selected collection(s): ${selectedCollections.join(', ')}?`;

    if (!window.confirm(confirmText)) return;

    try {
      setIsDeletingMongo(true);
      setActionMessage(null);
      const res = await fetch('/api/admin/storage/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'collections',
          selectedCollections,
          olderThanDays: Number(cleanupDays)
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Cleanup failed');

      setActionMessage({ type: 'success', text: result.message });
      setSelectedCollections([]);
      fetchStorageData();
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message });
    } finally {
      setIsDeletingMongo(false);
    }
  };

  const handleDeleteBlobFiles = async () => {
    if (selectedBlobUrls.length === 0) {
      alert('Please select at least one blob file to delete.');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete ${selectedBlobUrls.length} file(s) from Vercel Blob storage?`)) {
      return;
    }

    try {
      setIsDeletingBlob(true);
      setActionMessage(null);
      const res = await fetch('/api/admin/storage/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'blob',
          selectedBlobUrls
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Blob deletion failed');

      setActionMessage({ type: 'success', text: result.message });
      setSelectedBlobUrls([]);
      fetchStorageData();
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message });
    } finally {
      setIsDeletingBlob(false);
    }
  };

  const getBarColor = (percent) => {
    if (percent >= 85) return 'var(--color-danger, #ef4444)';
    if (percent >= 70) return 'var(--color-warning, #f59e0b)';
    return 'var(--color-success, #10b981)';
  };

  const getBadge = (status) => {
    if (status === 'critical') return <span className="badge badge-danger" style={{ fontWeight: 'bold' }}>CRITICAL (&gt;85%)</span>;
    if (status === 'warning') return <span className="badge badge-warning" style={{ fontWeight: 'bold' }}>WARNING (&gt;70%)</span>;
    return <span className="badge badge-success" style={{ fontWeight: 'bold' }}>HEALTHY (&lt;70%)</span>;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <span className="spinner" style={{ width: '32px', height: '32px', display: 'inline-block' }}></span>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Calculating Free-Tier Storage Usage...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', borderTop: '4px solid #ef4444' }}>
        <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error}</p>
        <Link href="/admin/dashboard" className="btn btn-primary">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const { mongo, blob, overallStatus } = data;

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Top Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Storage &amp; Backup Management</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
            Free-tier storage intimations, selective database exports, and asset cleanup for Administrators.
          </p>
        </div>
        <div>
          {getBadge(overallStatus)}
        </div>
      </div>

      {/* Intimation Alert Banner */}
      {overallStatus !== 'normal' && (
        <div style={{
          background: overallStatus === 'critical' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
          borderLeft: `5px solid ${overallStatus === 'critical' ? '#ef4444' : '#f59e0b'}`,
          padding: '1rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', color: overallStatus === 'critical' ? '#ef4444' : '#d97706' }}>
            ⚠️ Storage Intimation: Storage Capacity Warning
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            Your application free-tier storage is approaching capacity. You can select specific collections or blob files below to export backups and free up space before running out of quota.
          </p>
        </div>
      )}

      {/* Action Notification Alert */}
      {actionMessage && (
        <div className={`alert-${actionMessage.type}`} style={{ padding: '0.85rem 1.2rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          {actionMessage.text}
        </div>
      )}

      {/* Top Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {/* MongoDB Card */}
        <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', borderTop: `4px solid ${getBarColor(mongo.usagePercent)}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>🍃 MongoDB Database</h3>
            {getBadge(mongo.status)}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            {mongo.totalUsedMB} MB <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>/ {mongo.limitMB} MB Cap</span>
          </div>
          <div style={{ height: '8px', width: '100%', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.75rem' }}>
            <div style={{ height: '100%', width: `${mongo.usagePercent}%`, background: getBarColor(mongo.usagePercent), transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Data: {mongo.dataSizeMB} MB | Index: {mongo.indexSizeMB} MB</span>
            <span>{mongo.usagePercent}% Used</span>
          </div>
        </div>

        {/* Vercel Blob Card */}
        <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', borderTop: `4px solid ${getBarColor(blob.usagePercent)}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>☁️ Vercel Blob Storage</h3>
            {getBadge(blob.status)}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            {blob.totalUsedMB} MB <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>/ {blob.limitMB} MB Cap</span>
          </div>
          <div style={{ height: '8px', width: '100%', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.75rem' }}>
            <div style={{ height: '100%', width: `${blob.usagePercent}%`, background: getBarColor(blob.usagePercent), transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Files Stored: {blob.fileCount}</span>
            <span>{blob.usagePercent}% Used</span>
          </div>
        </div>
      </div>

      {/* Storage Tab Switcher */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color, #e5e7eb)', marginBottom: '1.5rem', gap: '1rem' }}>
        <button
          onClick={() => setActiveTab('mongo')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            borderBottom: activeTab === 'mongo' ? '3px solid var(--accent-color, #3b82f6)' : '3px solid transparent',
            color: activeTab === 'mongo' ? 'var(--accent-color, #3b82f6)' : 'var(--text-muted)'
          }}
        >
          🍃 MongoDB Collections ({mongo.collections.length})
        </button>
        <button
          onClick={() => setActiveTab('blob')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            borderBottom: activeTab === 'blob' ? '3px solid var(--accent-color, #3b82f6)' : '3px solid transparent',
            color: activeTab === 'blob' ? 'var(--accent-color, #3b82f6)' : 'var(--text-muted)'
          }}
        >
          ☁️ Vercel Blob Assets ({blob.fileCount})
        </button>
      </div>

      {/* TAB 1: MongoDB Selective Export & Cleanup */}
      {activeTab === 'mongo' && (
        <div className="card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Database Collections &amp; Size Breakdown</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Select specific collections to export JSON backups or perform data cleanup.
              </p>
            </div>

            {/* Quick Action Toolbar */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => handleExportDatabase('full')}
                title="Export complete database backup as JSON"
              >
                📥 Export Full Database (All)
              </button>
              
              <button 
                className="btn btn-primary"
                onClick={() => handleExportDatabase('collections')}
                disabled={selectedCollections.length === 0}
                title="Export selected collections as JSON"
              >
                📥 Export Selected ({selectedCollections.length})
              </button>
            </div>
          </div>

          {/* Cleanup Control Panel */}
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.05)', 
            border: '1px dashed rgba(239, 68, 68, 0.3)', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#dc2626' }}>🧹 Selective Cleanup:</span>
              <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                Filter age cutoff:
                <select 
                  value={cleanupDays} 
                  onChange={(e) => setCleanupDays(e.target.value)}
                  style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="7">Older than 7 days</option>
                  <option value="15">Older than 15 days</option>
                  <option value="30">Older than 30 days</option>
                  <option value="90">Older than 90 days</option>
                  <option value="0">All Documents (Full Purge)</option>
                </select>
              </label>
            </div>

            <button 
              className="btn btn-danger"
              onClick={handleCleanupCollections}
              disabled={selectedCollections.length === 0 || isDeletingMongo}
              style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '0.45rem 1rem', borderRadius: '6px' }}
            >
              {isDeletingMongo ? 'Cleaning Up...' : `Delete Selected Docs (${selectedCollections.length})`}
            </button>
          </div>

          {/* Collections Table */}
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input 
                      type="checkbox" 
                      checked={mongo.collections.length > 0 && selectedCollections.length === mongo.collections.length}
                      onChange={toggleSelectAllCollections}
                    />
                  </th>
                  <th>Model / Collection Name</th>
                  <th>Total Documents</th>
                  <th>Estimated Size</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mongo.collections.map((coll) => {
                  const isSelected = selectedCollections.includes(coll.name);
                  return (
                    <tr key={coll.name} style={{ background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleSelectCollection(coll.name)}
                        />
                      </td>
                      <td>
                        <strong>{coll.modelName}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Collection: <code>{coll.name}</code></div>
                      </td>
                      <td>
                        <span style={{ fontWeight: '600' }}>{coll.count.toLocaleString()}</span> docs
                      </td>
                      <td>
                        <strong>{coll.sizeMB} MB</strong>
                      </td>
                      <td>
                        {coll.count > 0 ? (
                          <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>Active Data</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Empty</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Vercel Blob Selective Export & Deletion */}
      {activeTab === 'blob' && (
        <div className="card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Vercel Blob Storage File Assets</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                View uploaded images/PDF template assets, export URL manifest, or delete unused files.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => handleExportDatabase('blob_manifest')}
                title="Export complete list of blob files as JSON"
              >
                📥 Export Manifest ({selectedBlobUrls.length > 0 ? `${selectedBlobUrls.length} Selected` : 'All'})
              </button>

              <button 
                className="btn btn-danger"
                onClick={handleDeleteBlobFiles}
                disabled={selectedBlobUrls.length === 0 || isDeletingBlob}
                style={{ background: '#dc2626', color: '#fff', border: 'none' }}
              >
                {isDeletingBlob ? 'Deleting...' : `🗑️ Delete Selected (${selectedBlobUrls.length})`}
              </button>
            </div>
          </div>

          {blob.files.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              📷 No files currently uploaded in Vercel Blob storage.
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input 
                        type="checkbox" 
                        checked={blob.files.length > 0 && selectedBlobUrls.length === blob.files.length}
                        onChange={toggleSelectAllBlobs}
                      />
                    </th>
                    <th>File Asset Path</th>
                    <th>Size</th>
                    <th>Upload Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blob.files.map((file) => {
                    const isSelected = selectedBlobUrls.includes(file.url);
                    return (
                      <tr key={file.url} style={{ background: isSelected ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                        <td>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelectBlob(file.url)}
                          />
                        </td>
                        <td>
                          <div style={{ fontWeight: '600', wordBreak: 'break-all' }}>{file.pathname}</div>
                        </td>
                        <td>
                          <strong>{file.sizeKB} KB</strong>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem' }}>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                        </td>
                        <td>
                          <a 
                            href={`/api/image-proxy?url=${encodeURIComponent(file.url)}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="btn btn-secondary" 
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                          >
                            👁️ View Image
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
