import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { del } from '@vercel/blob';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import * as models from '@/lib/models';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifyToken(token) : null;

    if (!session || !session.isSuperuser) {
      return NextResponse.json({ error: 'Forbidden: Superuser access required' }, { status: 403 });
    }

    const body = await request.json();
    const { target, selectedCollections, olderThanDays, selectedBlobUrls } = body;

    await dbConnect();

    // 1. Cleanup Vercel Blob files
    if (target === 'blob' && Array.isArray(selectedBlobUrls) && selectedBlobUrls.length > 0) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN environment variable is missing' }, { status: 400 });
      }

      await del(selectedBlobUrls, { token: process.env.BLOB_READ_WRITE_TOKEN });

      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${selectedBlobUrls.length} file(s) from Vercel Blob storage.`,
        deletedCount: selectedBlobUrls.length
      });
    }

    // 2. Cleanup Database Collections
    if (target === 'collections' && Array.isArray(selectedCollections) && selectedCollections.length > 0) {
      const summary = [];
      let totalDeletedDocs = 0;

      const dateCutoff = olderThanDays && Number(olderThanDays) > 0
        ? new Date(Date.now() - Number(olderThanDays) * 24 * 60 * 60 * 1000)
        : null;

      for (const collName of selectedCollections) {
        const ModelKey = Object.keys(models).find(
          k => k.toLowerCase() === collName.toLowerCase() || models[k]?.collection?.name.toLowerCase() === collName.toLowerCase()
        );

        if (!ModelKey || !models[ModelKey]) continue;

        const Model = models[ModelKey];
        let filter = {};

        if (dateCutoff) {
          // Identify date field if applicable
          if (ModelKey === 'SentEmailLog') {
            filter = { sentAt: { $lt: dateCutoff } };
          } else if (ModelKey === 'ExamSession') {
            filter = { startedAt: { $lt: dateCutoff } };
          } else if (ModelKey === 'ExamAssignment') {
            filter = { createdAt: { $lt: dateCutoff } };
          } else if (ModelKey === 'Candidate') {
            filter = { createdAt: { $lt: dateCutoff } };
          } else if (ModelKey === 'CandidateAnswer') {
            filter = { answeredAt: { $lt: dateCutoff } };
          }
        }

        const deleteResult = await Model.deleteMany(filter);
        totalDeletedDocs += deleteResult.deletedCount || 0;

        summary.push({
          collection: Model.collection.name,
          modelName: ModelKey,
          deletedCount: deleteResult.deletedCount || 0
        });
      }

      return NextResponse.json({
        success: true,
        message: `Cleanup completed. Deleted total ${totalDeletedDocs} document(s) across ${summary.length} collection(s).`,
        summary,
        totalDeletedDocs
      });
    }

    return NextResponse.json({ error: 'Invalid cleanup request parameters' }, { status: 400 });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: error.message || 'Cleanup operation failed' }, { status: 500 });
  }
}
