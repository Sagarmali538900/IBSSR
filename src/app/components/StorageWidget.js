'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function StorageWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/storage/status');
      if (res.status === 403) {
        // Non-superuser/franchise account, do not display storage widget
        setData(null);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch storage status');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.7 }}>
          <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
          <span>Loading storage health monitors...</span>
        </div>
      </div>
    );
  }

  if (error || !data) return null;

  const { mongo, blob, overallStatus } = data;

  const getStatusBadge = (status) => {
    if (status === 'critical') return <span className="badge badge-danger" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 'bold' }}>CRITICAL (&gt;85%)</span>;
    if (status === 'warning') return <span className="badge badge-warning" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 'bold' }}>WARNING (&gt;70%)</span>;
    return <span className="badge badge-success" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 'bold' }}>HEALTHY (&lt;70%)</span>;
  };

  const getBarColor = (percent) => {
    if (percent >= 85) return 'var(--color-danger, #ef4444)';
    if (percent >= 70) return 'var(--color-warning, #f59e0b)';
    return 'var(--color-success, #10b981)';
  };

  return (
    <div 
      className="card" 
      style={{ 
        padding: '1.25rem', 
        borderRadius: '12px', 
        marginBottom: '1.5rem',
        border: overallStatus !== 'normal' ? '1.5px solid ' + (overallStatus === 'critical' ? '#ef4444' : '#f59e0b') : '1px solid var(--border-color, #e5e7eb)',
        background: 'var(--card-bg, #ffffff)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Free-Tier Storage Intimation</h3>
          {getStatusBadge(overallStatus)}
        </div>
        <Link href="/admin/storage" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.825rem' }}>
          Manage &amp; Export Storage &rarr;
        </Link>
      </div>

      {overallStatus !== 'normal' && (
        <div style={{ 
          background: overallStatus === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
          borderLeft: `4px solid ${overallStatus === 'critical' ? '#ef4444' : '#f59e0b'}`,
          padding: '0.65rem 0.9rem',
          borderRadius: '6px',
          marginBottom: '1rem',
          fontSize: '0.875rem'
        }}>
          ⚠️ <strong>Storage Intimation Alert:</strong> Free-tier capacity is getting full. Consider exporting database backups and performing data cleanup.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {/* MongoDB Meter */}
        <div style={{ background: 'var(--bg-subtle, #f9fafb)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color, #e5e7eb)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
            <span><strong>MongoDB Atlas (Free 512 MB)</strong></span>
            <span><strong>{mongo.totalUsedMB} MB</strong> / {mongo.limitMB} MB ({mongo.usagePercent}%)</span>
          </div>
          <div style={{ height: '8px', width: '100%', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${mongo.usagePercent}%`, background: getBarColor(mongo.usagePercent), transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Vercel Blob Meter */}
        <div style={{ background: 'var(--bg-subtle, #f9fafb)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color, #e5e7eb)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
            <span><strong>Vercel Blob (Free 250 MB)</strong></span>
            <span><strong>{blob.totalUsedMB} MB</strong> / {blob.limitMB} MB ({blob.usagePercent}%)</span>
          </div>
          <div style={{ height: '8px', width: '100%', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${blob.usagePercent}%`, background: getBarColor(blob.usagePercent), transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
