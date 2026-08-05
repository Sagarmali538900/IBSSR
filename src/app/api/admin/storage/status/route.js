import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { list } from '@vercel/blob';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import * as models from '@/lib/models';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifyToken(token) : null;

    if (!session || !session.isSuperuser) {
      return NextResponse.json({ error: 'Forbidden: Superuser access required' }, { status: 403 });
    }

    await dbConnect();

    // 1. MongoDB Database Stats
    const db = mongoose.connection.db;
    const dbStats = await db.stats();

    // M0 Free tier limit is ~512 MB
    const MONGO_LIMIT_BYTES = 512 * 1024 * 1024; // 536870912 bytes
    const mongoDataSize = dbStats.dataSize || 0;
    const mongoStorageSize = dbStats.storageSize || 0;
    const mongoIndexSize = dbStats.indexSize || 0;
    const mongoTotalUsed = mongoStorageSize + mongoIndexSize;
    const mongoUsagePercent = Math.min(100, (mongoTotalUsed / MONGO_LIMIT_BYTES) * 100);

    // Detailed per-collection breakdown
    const modelKeys = Object.keys(models);
    const collections = [];

    for (const key of modelKeys) {
      const Model = models[key];
      if (Model && Model.collection) {
        const count = await Model.countDocuments();
        let sizeBytes = 0;
        try {
          const stats = await db.command({ collStats: Model.collection.name });
          sizeBytes = stats.size || stats.storageSize || 0;
        } catch (e) {
          sizeBytes = count * 250; // Fallback estimate ~250 bytes per document if collStats fails
        }
        collections.push({
          name: Model.collection.name,
          modelName: key,
          count,
          sizeBytes,
          sizeMB: (sizeBytes / (1024 * 1024)).toFixed(3)
        });
      }
    }

    // Sort collections by size descending
    collections.sort((a, b) => b.sizeBytes - a.sizeBytes);

    // 2. Vercel Blob Storage Stats
    let blobFiles = [];
    let blobTotalBytes = 0;
    let blobUsagePercent = 0;
    const BLOB_LIMIT_BYTES = 250 * 1024 * 1024; // 250 MB Free tier cap

    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { blobs } = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
        blobFiles = blobs.map(b => ({
          url: b.url,
          pathname: b.pathname,
          size: b.size,
          sizeKB: (b.size / 1024).toFixed(2),
          uploadedAt: b.uploadedAt
        }));
        blobTotalBytes = blobFiles.reduce((acc, file) => acc + (file.size || 0), 0);
        blobUsagePercent = Math.min(100, (blobTotalBytes / BLOB_LIMIT_BYTES) * 100);
      }
    } catch (err) {
      console.error('Error fetching Vercel Blob stats:', err);
    }

    // 3. Intimation Health Status calculation
    const getHealthStatus = (percent) => {
      if (percent >= 85) return 'critical';
      if (percent >= 70) return 'warning';
      return 'normal';
    };

    const mongoStatus = getHealthStatus(mongoUsagePercent);
    const blobStatus = getHealthStatus(blobUsagePercent);
    const overallStatus = (mongoStatus === 'critical' || blobStatus === 'critical')
      ? 'critical'
      : (mongoStatus === 'warning' || blobStatus === 'warning')
      ? 'warning'
      : 'normal';

    return NextResponse.json({
      success: true,
      mongo: {
        totalUsedBytes: mongoTotalUsed,
        totalUsedMB: (mongoTotalUsed / (1024 * 1024)).toFixed(2),
        limitBytes: MONGO_LIMIT_BYTES,
        limitMB: 512,
        dataSizeMB: (mongoDataSize / (1024 * 1024)).toFixed(2),
        indexSizeMB: (mongoIndexSize / (1024 * 1024)).toFixed(2),
        usagePercent: Number(mongoUsagePercent.toFixed(1)),
        status: mongoStatus,
        collections
      },
      blob: {
        totalUsedBytes: blobTotalBytes,
        totalUsedMB: (blobTotalBytes / (1024 * 1024)).toFixed(2),
        limitBytes: BLOB_LIMIT_BYTES,
        limitMB: 250,
        usagePercent: Number(blobUsagePercent.toFixed(1)),
        fileCount: blobFiles.length,
        status: blobStatus,
        files: blobFiles
      },
      overallStatus
    });
  } catch (error) {
    console.error('Error fetching storage status:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch storage status' }, { status: 500 });
  }
}
