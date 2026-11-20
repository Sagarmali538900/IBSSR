'use client';

import { useAlerts } from '@/app/components/AlertProvider';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { inputSchemas, validateInput } from '@/lib/validation';

export default function StoragePage() {
  const { notify, confirmAction } = useAlerts();
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
  const toggleSelectCollection = (name, protectionLevel) => {
    if (protectionLevel === 'do_not_delete') {
      notify(`“${name}” contains data required by the assessment system and cannot be selected for cleanup.`, 'warning');
      return;
    }
    setSelectedCollections(prev => 
      prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]
    );
  };

  const toggleSelectAllCollections = () => {
    if (!data?.mongo?.collections) return;
    // Only select collections that are NOT marked as 'do_not_delete'
    const deletableCollections = data.mongo.collections
      .filter(c => c.protectionLevel !== 'do_not_delete')
      .map(c => c.name);

    if (selectedCollections.length === deletableCollections.length) {
      setSelectedCollections([]);
    } else {
      setSelectedCollections(deletableCollections);
    }
  };

  // Blob File Selection Handlers
  const toggleSelectBlob = async (url, isProtected, protectionNote) => {
    if (isProtected) {
      const proceed = await confirmAction(`${protectionNote}\n\nDeleting this asset may affect reports or assessment content.`, { title: 'Protected asset selected', confirmLabel: 'Select asset', tone: 'warning' });
      if (!proceed) return;
    }
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
    const validation = validateInput(inputSchemas.storageCleanup, { target: 'collections', selectedCollections, selectedBlobUrls: [], olderThanDays: cleanupDays });
    if (!validation.success) {
      notify(validation.message, 'warning');
      return;
    }

    const confirmText = Number(cleanupDays) > 0 
      ? `Are you sure you want to delete documents older than ${cleanupDays} days from selected collection(s): ${selectedCollections.join(', ')}?`
      : `WARNING: Are you sure you want to delete ALL documents from selected collection(s): ${selectedCollections.join(', ')}?`;

    if (!await confirmAction(confirmText, { title: 'Clean up selected collections?', confirmLabel: 'Clean up', tone: 'danger' })) return;

    try {
      setIsDeletingMongo(true);
      setActionMessage(null);
      const res = await fetch('/api/admin/storage/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data)
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
    const validation = validateInput(inputSchemas.storageCleanup, { target: 'blob', selectedCollections: [], selectedBlobUrls, olderThanDays: 0 });
    if (!validation.success) {
      notify(validation.message, 'warning');
      return;
    }

    // Check if any selected blob is protected
    const protectedCount = data.blob.files.filter(f => selectedBlobUrls.includes(f.url) && f.isProtected).length;
    let confirmMsg = `Are you sure you want to permanently delete ${selectedBlobUrls.length} file(s) from Vercel Blob storage?`;
    
    if (protectedCount > 0) {
      confirmMsg = `You selected ${protectedCount} protected asset(s) used by reports or assessment questions. Deleting them may break generated scorecards or assessment content. Continue?`;
    }

    if (!await confirmAction(confirmMsg, { title: 'Delete selected files?', confirmLabel: 'Delete files', tone: 'danger' })) return;

    try {
      setIsDeletingBlob(true);
      setActionMessage(null);
      const res = await fetch('/api/admin/storage/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data)
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
    return 'var(--color-success, var(--accent-green))';
  };

  const getStatusLabel = (status) => status === 'critical' ? 'High usage' : status === 'warning' ? 'Review usage' : 'Healthy';

  if (loading) {
    return (
      <div className="storage-loading" role="status">
        <span className="spinner" />
        <p>Loading storage usage and data safety details…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="storage-error" role="alert">
        <div>
          <span className="storage-eyebrow">STORAGE MANAGEMENT</span>
          <h1>Storage details are unavailable</h1>
          <p>{error}</p>
        </div>
        <Link href="/admin/dashboard" className="btn btn-primary">Return to overview</Link>
      </div>
    );
  }

  const { mongo, blob, overallStatus } = data;
  const deletableCollections = mongo.collections.filter((collection) => collection.protectionLevel !== 'do_not_delete');
  const allCollectionsSelected = deletableCollections.length > 0 && selectedCollections.length === deletableCollections.length;

  return (
    <main className="storage-page">
      <header className="storage-page-header">
        <div>
          <span className="storage-eyebrow">SYSTEM MANAGEMENT</span>
          <h1>Storage &amp; data</h1>
          <p>Monitor capacity, export records, and manage uploaded assets.</p>
        </div>
        <span className={`storage-status is-${overallStatus || 'normal'}`}>
          <span className="storage-status-dot" />{getStatusLabel(overallStatus)}
        </span>
      </header>

      {overallStatus !== 'normal' && (
        <div className={`storage-capacity-alert is-${overallStatus}`} role="status">
          <strong>{overallStatus === 'critical' ? 'Storage is nearing its limit' : 'Storage usage needs attention'}</strong>
          <span>Review capacity below and remove only data that is no longer needed.</span>
        </div>
      )}

      {actionMessage && (
        <div className={`storage-feedback is-${actionMessage.type}`} role={actionMessage.type === 'danger' ? 'alert' : 'status'}>
          {actionMessage.text}
        </div>
      )}

      <section className="storage-capacity-grid" aria-label="Storage capacity">
        <article className="storage-capacity-card">
          <div className="storage-capacity-topline">
            <div>
              <span className="storage-eyebrow">DATABASE</span>
              <h2>MongoDB</h2>
            </div>
            <span className={`storage-status is-${mongo.status || 'normal'}`}>{getStatusLabel(mongo.status)}</span>
          </div>
          <div className="storage-capacity-number">
            <strong>{mongo.totalUsedMB}</strong><span>MB used</span>
            <span className="storage-capacity-limit">of {mongo.limitMB} MB</span>
          </div>
          <div className="storage-progress" role="progressbar" aria-label="MongoDB storage used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(mongo.usagePercent)}>
            <span style={{ width: `${Math.min(Number(mongo.usagePercent) || 0, 100)}%`, background: getBarColor(mongo.usagePercent) }} />
          </div>
          <div className="storage-capacity-foot"><span>Data {mongo.dataSizeMB} MB · Index {mongo.indexSizeMB} MB</span><strong>{mongo.usagePercent}% used</strong></div>
        </article>

        <article className="storage-capacity-card">
          <div className="storage-capacity-topline">
            <div>
              <span className="storage-eyebrow">UPLOADED FILES</span>
              <h2>Vercel Blob</h2>
            </div>
            <span className={`storage-status is-${blob.status || 'normal'}`}>{getStatusLabel(blob.status)}</span>
          </div>
          <div className="storage-capacity-number">
            <strong>{blob.totalUsedMB}</strong><span>MB used</span>
            <span className="storage-capacity-limit">of {blob.limitMB} MB</span>
          </div>
          <div className="storage-progress" role="progressbar" aria-label="Uploaded file storage used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(blob.usagePercent)}>
            <span style={{ width: `${Math.min(Number(blob.usagePercent) || 0, 100)}%`, background: getBarColor(blob.usagePercent) }} />
          </div>
          <div className="storage-capacity-foot"><span>{blob.fileCount} {blob.fileCount === 1 ? 'file' : 'files'} stored</span><strong>{blob.usagePercent}% used</strong></div>
        </article>
      </section>

      <section className="storage-guidance" aria-labelledby="storage-guidance-title">
        <div className="storage-guidance-heading">
          <div>
            <span className="storage-eyebrow">DATA SAFETY</span>
            <h2 id="storage-guidance-title">Before you clean up</h2>
          </div>
          <p>Protected collections and assets cannot be selected for deletion.</p>
        </div>
        <div className="storage-guidance-grid">
          <article><span className="storage-guidance-label is-protected">Protected collections</span><p>Users, exams, sections, questions, options, and PDF templates are required for portal operations.</p></article>
          <article><span className="storage-guidance-label is-protected">Referenced files</span><p>Images used by scorecards or assessment questions should remain in storage.</p></article>
          <article><span className="storage-guidance-label is-safe">Potential cleanup</span><p>Export first. Review older email logs and completed assessment data before removal.</p></article>
        </div>
      </section>

      <nav className="storage-tabs" role="tablist" aria-label="Storage type">
        <button type="button" role="tab" aria-selected={activeTab === 'mongo'} className={activeTab === 'mongo' ? 'is-active' : ''} onClick={() => setActiveTab('mongo')}>
          Database collections <span>{mongo.collections.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'blob'} className={activeTab === 'blob' ? 'is-active' : ''} onClick={() => setActiveTab('blob')}>
          Uploaded files <span>{blob.fileCount}</span>
        </button>
      </nav>

      {activeTab === 'mongo' ? (
        <section className="storage-panel" aria-labelledby="storage-collections-title">
          <div className="storage-panel-heading">
            <div>
              <span className="storage-eyebrow">DATABASE</span>
              <h2 id="storage-collections-title">Collections</h2>
              <p>Review record counts, storage size, and cleanup eligibility.</p>
            </div>
            <div className="storage-toolbar">
              <button type="button" className="storage-button is-secondary" onClick={() => handleExportDatabase('full')}>Export full backup</button>
              <button type="button" className="storage-button is-primary" onClick={() => handleExportDatabase('collections')} disabled={selectedCollections.length === 0}>
                Export selected <span>{selectedCollections.length}</span>
              </button>
            </div>
          </div>

          <div className="storage-cleanup-bar">
            <div className="storage-cleanup-copy">
              <strong>Clean up selected records</strong>
              <span>Only records older than the selected period will be removed.</span>
            </div>
            <label className="storage-age-select">Age
              <select value={cleanupDays} onChange={(event) => setCleanupDays(event.target.value)}>
                <option value="7">7+ days</option><option value="15">15+ days</option><option value="30">30+ days</option><option value="90">90+ days</option><option value="0">All records</option>
              </select>
            </label>
            <button type="button" className="storage-button is-danger" onClick={handleCleanupCollections} disabled={selectedCollections.length === 0 || isDeletingMongo}>
              {isDeletingMongo ? 'Cleaning up…' : `Delete ${selectedCollections.length} selected`}
            </button>
          </div>

          <div className="storage-table-wrap">
            <table className="storage-table">
              <thead><tr>
                <th className="storage-checkbox-column"><input type="checkbox" aria-label="Select all removable collections" checked={allCollectionsSelected} onChange={toggleSelectAllCollections} /></th>
                <th>Collection</th><th>Documents</th><th>Storage</th><th>Access</th><th>Notes</th>
              </tr></thead>
              <tbody>
                {mongo.collections.map((collection) => {
                  const isSelected = selectedCollections.includes(collection.name);
                  const isProtected = collection.protectionLevel === 'do_not_delete';
                  const isSafe = collection.protectionLevel === 'safe_to_cleanup';
                  return (
                    <tr key={collection.name} className={`${isProtected ? 'is-protected' : ''}${isSelected ? ' is-selected' : ''}`}>
                      <td className="storage-checkbox-column"><input type="checkbox" aria-label={`Select ${collection.modelName}`} disabled={isProtected} checked={isSelected} onChange={() => toggleSelectCollection(collection.name, collection.protectionLevel)} /></td>
                      <td><strong className="storage-model-name">{collection.modelName}</strong><code className="storage-collection-name">{collection.name}</code></td>
                      <td className="storage-doc-count">{collection.count.toLocaleString()}</td>
                      <td className="storage-size">{collection.sizeMB} MB</td>
                      <td><span className={`storage-access-label ${isProtected ? 'is-protected' : isSafe ? 'is-safe' : 'is-caution'}`}>{isProtected ? 'Protected' : isSafe ? 'Cleanup eligible' : 'Review first'}</span></td>
                      <td className="storage-note">{collection.protectionNote}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="storage-panel" aria-labelledby="storage-assets-title">
          <div className="storage-panel-heading">
            <div>
              <span className="storage-eyebrow">UPLOADED FILES</span>
              <h2 id="storage-assets-title">Blob assets</h2>
              <p>Referenced images are marked as protected. Verify each file before deleting it.</p>
            </div>
            <div className="storage-toolbar">
              <button type="button" className="storage-button is-secondary" onClick={() => handleExportDatabase('blob_manifest')}>Export manifest</button>
              <button type="button" className="storage-button is-danger" onClick={handleDeleteBlobFiles} disabled={selectedBlobUrls.length === 0 || isDeletingBlob}>
                {isDeletingBlob ? 'Deleting…' : `Delete ${selectedBlobUrls.length} selected`}
              </button>
            </div>
          </div>
          {blob.files.length === 0 ? (
            <div className="storage-empty"><strong>No uploaded files</strong><span>Files added to assessments or report templates will appear here.</span></div>
          ) : (
            <div className="storage-table-wrap">
              <table className="storage-table">
                <thead><tr>
                  <th className="storage-checkbox-column"><input type="checkbox" aria-label="Select all files" checked={blob.files.length > 0 && selectedBlobUrls.length === blob.files.length} onChange={toggleSelectAllBlobs} /></th>
                  <th>File</th><th>Size</th><th>Uploaded</th><th>Reference</th><th>Action</th>
                </tr></thead>
                <tbody>
                  {blob.files.map((file) => {
                    const isSelected = selectedBlobUrls.includes(file.url);
                    return (
                      <tr key={file.url} className={`${file.isProtected ? 'is-protected' : ''}${isSelected ? ' is-selected' : ''}`}>
                        <td className="storage-checkbox-column"><input type="checkbox" aria-label={`Select ${file.pathname}`} checked={isSelected} onChange={() => toggleSelectBlob(file.url, file.isProtected, file.protectionNote)} /></td>
                        <td><strong className="storage-model-name storage-path">{file.pathname}</strong></td>
                        <td className="storage-size">{file.sizeKB} KB</td>
                        <td>{new Date(file.uploadedAt).toLocaleDateString()}</td>
                        <td><span className={`storage-access-label ${file.isProtected ? 'is-protected' : 'is-safe'}`}>{file.isProtected ? (file.protectedType === 'pdf_template' ? 'Report template' : 'Assessment image') : 'Unreferenced'}</span></td>
                        <td><a href={`/api/image-proxy?url=${encodeURIComponent(file.url)}`} target="_blank" rel="noreferrer" className="storage-view-link">View file</a></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}