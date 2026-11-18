import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { list } from '@vercel/blob';
import dbConnect from '@/db';
import { verifyToken } from '@/auth';
import * as models from '@/models';
import { schemas } from '@/lib/schemas';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifyToken(token) : null;

    if (!session || !session.isSuperuser) {
      return NextResponse.json({ error: 'Forbidden: Superuser access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const queryValidation = schemas.storageExportQuery.safeParse({
      type: searchParams.get('type') || undefined,
      names: searchParams.get('names') || '',
      urls: searchParams.get('urls')?.split(',').filter(Boolean),
    });
    if (!queryValidation.success) return NextResponse.json({ error: queryValidation.error.issues[0]?.message || 'Invalid export parameters.' }, { status: 400 });
    const { type, names: selectedCollectionsParam, urls } = queryValidation.data;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (type === 'blob_manifest') {
      let blobsList = [];
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { blobs } = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
        blobsList = blobs;
      }
      
      const filterUrls = urls;
      if (filterUrls && filterUrls.length > 0) {
        blobsList = blobsList.filter(b => filterUrls.includes(b.url));
      }

      const manifestData = {
        exportedAt: new Date().toISOString(),
        totalFiles: blobsList.length,
        totalSizeBytes: blobsList.reduce((acc, f) => acc + (f.size || 0), 0),
        files: blobsList
      };

      const jsonStr = JSON.stringify(manifestData, null, 2);
      return new Response(jsonStr, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="IBSSR_Blob_Manifest_${timestamp}.json"`
        }
      });
    }

    // Database Collections Export
    await dbConnect();
    const exportData = {};
    let modelKeys = Object.keys(models);

    if (type === 'collections' && selectedCollectionsParam) {
      const targetNames = selectedCollectionsParam.split(',').map(s => s.trim().toLowerCase());
      modelKeys = modelKeys.filter(key => targetNames.includes(key.toLowerCase()) || targetNames.includes(models[key]?.collection?.name.toLowerCase()));
    }

    for (const key of modelKeys) {
      const Model = models[key];
      if (Model && Model.find) {
        const docs = await Model.find({}).lean();
        exportData[key] = docs;
      }
    }

    const backupPayload = {
      metadata: {
        system: 'IBSSR Administration Portal',
        exportedBy: session.username,
        exportedAt: new Date().toISOString(),
        collectionsCount: Object.keys(exportData).length,
        version: '1.0'
      },
      collections: exportData
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const filename = type === 'collections' && selectedCollectionsParam 
      ? `IBSSR_Selected_Collections_${timestamp}.json`
      : `IBSSR_Full_Database_Backup_${timestamp}.json`;

    return new Response(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
