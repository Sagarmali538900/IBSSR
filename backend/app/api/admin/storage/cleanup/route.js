import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { del } from '@vercel/blob';
import dbConnect from '@/db';
import { verifyToken } from '@/auth';
import * as models from '@/models';
import { readValidatedJson } from '@/lib/validation';
import { schemas } from '@/lib/schemas';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifyToken(token) : null;

    if (!session || !session.isSuperuser) {
      return NextResponse.json({ error: 'Forbidden: Superuser access required' }, { status: 403 });
    }

    const validation = await readValidatedJson(request, schemas.storageCleanup);
    if (!validation.success) return validation.response;
    const { target, selectedCollections, olderThanDays, selectedBlobUrls } = validation.data;

    if (target === 'collections') {
      const protectedModels = new Set(['PdfTemplate', 'User', 'Exam', 'Section', 'Question', 'Option']);
      const invalidCollection = selectedCollections.find((name) => {
        const Model = Object.values(models).find((item) => item?.collection?.name?.toLowerCase() === name.toLowerCase());
        return !Model || protectedModels.has(Model.modelName);
      });
      if (invalidCollection) return NextResponse.json({ error: `Collection '${invalidCollection}' is not available for cleanup.` }, { status: 400 });
    }

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
