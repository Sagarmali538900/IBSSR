'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from './Icon';

export default function StorageWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/admin/storage/status')
      .then(async (response) => {
        if (response.status === 403) return null;
        if (!response.ok) throw new Error('Could not load storage status.');
        return response.json();
      })
      .then((status) => {
        if (!cancelled) setData(status);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  if (loading || error || !data) return null;

  const { mongo, blob, overallStatus } = data;
  const statusLabel = overallStatus === 'critical'
    ? 'Near capacity'
    : overallStatus === 'warning'
      ? 'Review usage'
      : 'Healthy';

  return (
    <section className="dashboard-storage-summary" aria-label="Storage usage">
      <div className="storage-summary-heading">
        <span className="storage-summary-icon"><Icon name="storage" size={17} /></span>
        <span className="storage-summary-title">Storage</span>
        <span className={`storage-summary-status is-${overallStatus || 'normal'}`} role="status">
          <span />{statusLabel}
        </span>
      </div>
      <div className="storage-summary-values">
        <span>Database <strong>{mongo.totalUsedMB} / {mongo.limitMB} MB</strong></span>
        <span>Files <strong>{blob.totalUsedMB} / {blob.limitMB} MB</strong></span>
      </div>
      <Link href="/admin/storage" className="storage-summary-link">
        View storage <Icon name="chevronRight" size={15} />
      </Link>
    </section>
  );
}
