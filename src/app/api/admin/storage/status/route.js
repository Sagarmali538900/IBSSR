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

    // Collection Protection Level Mapping
    const getProtectionInfo = (modelName) => {
      switch (modelName) {
        case 'PdfTemplate':
          return {
            level: 'do_not_delete',
            badge: '🛑 DO NOT DELETE',
            note: 'CRITICAL FOR PDF GENERATION: Stores background image references for PDF scorecards (Cover, Benefits, Career Model, Back Cover).'
          };
        case 'User':
          return {
            level: 'do_not_delete',
            badge: '🛑 DO NOT DELETE',
            note: 'CRITICAL SYSTEM DATA: Stores Administrator & Franchise login accounts.'
          };
        case 'Exam':
          return {
            level: 'do_not_delete',
            badge: '🛑 DO NOT DELETE',
            note: 'CRITICAL EXAM DATA: Assessment structures and configuration settings.'
          };
        case 'Section':
          return {
            level: 'do_not_delete',
            badge: '🛑 DO NOT DELETE',
            note: 'CRITICAL EXAM DATA: Exam section timers and ordering rules.'
          };
        case 'Question':
          return {
            level: 'do_not_delete',
            badge: '🛑 DO NOT DELETE',
            note: 'CRITICAL EXAM DATA: Test questions and image references.'
          };
        case 'Option':
          return {
            level: 'do_not_delete',
            badge: '🛑 DO NOT DELETE',
            note: 'CRITICAL EXAM DATA: Question options and scoring weights.'
          };
        case 'SentEmailLog':
          return {
            level: 'safe_to_cleanup',
            badge: '🟢 SAFE TO CLEANUP',
            note: 'RECOMMENDED FOR SPACE RECLAMATION: Outgoing email notification logs. Safe to delete anytime to free up MongoDB storage.'
          };
        case 'CandidateAnswer':
          return {
            level: 'caution',
            badge: '⚠️ CAUTION',
            note: 'TEST DATA: Raw candidate responses. Safe to clean up older logs if tests are already scored and completed.'
          };
        case 'ExamSession':
          return {
            level: 'caution',
            badge: '⚠️ CAUTION',
            note: 'TEST DATA: Active & completed candidate test sessions.'
          };
        case 'ExamResult':
        case 'SectionResult':
          return {
            level: 'caution',
            badge: '⚠️ CAUTION',
            note: 'RESULT DATA: Computed score outputs used for PDF scorecard generation.'
          };
        default:
          return {
            level: 'caution',
            badge: '⚠️ CAUTION',
            note: 'Standard application data collection.'
          };
      }
    };

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
        
        const protection = getProtectionInfo(key);

        collections.push({
          name: Model.collection.name,
          modelName: key,
          count,
          sizeBytes,
          sizeMB: (sizeBytes / (1024 * 1024)).toFixed(3),
          protectionLevel: protection.level,
          protectionBadge: protection.badge,
          protectionNote: protection.note
        });
      }
    }

    // Sort collections by size descending
    collections.sort((a, b) => b.sizeBytes - a.sizeBytes);

    // 2. Fetch Protected Image URLs from DB for Vercel Blob inspection
    const pdfTemplates = await models.PdfTemplate.find({}).lean();
    const pdfTemplateUrls = new Set(pdfTemplates.map(t => t.imageUrl).filter(Boolean));

    const questionsWithImages = await models.Question.find({ image: { $ne: null } }).lean();
    const questionImageUrls = new Set(questionsWithImages.map(q => q.image).filter(Boolean));

    const optionsWithImages = await models.Option.find({ image: { $ne: null } }).lean();
    const optionImageUrls = new Set(optionsWithImages.map(o => o.image).filter(Boolean));

    // 3. Vercel Blob Storage Stats
    let blobFiles = [];
    let blobTotalBytes = 0;
    let blobUsagePercent = 0;
    const BLOB_LIMIT_BYTES = 250 * 1024 * 1024; // 250 MB Free tier cap

    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { blobs } = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
        blobFiles = blobs.map(b => {
          let isProtected = false;
          let protectedType = 'general';
          let protectionBadge = '🟢 General Upload';
          let protectionNote = 'Standard asset.';

          if (pdfTemplateUrls.has(b.url)) {
            isProtected = true;
            protectedType = 'pdf_template';
            protectionBadge = '🔒 PDF Template Image';
            protectionNote = 'CRITICAL FOR PDF GENERATION: Active background template image for candidate report PDF. DO NOT DELETE!';
          } else if (questionImageUrls.has(b.url) || optionImageUrls.has(b.url)) {
            isProtected = true;
            protectedType = 'exam_image';
            protectionBadge = '⚠️ Exam Question Image';
            protectionNote = 'CRITICAL FOR EXAMS: Image attached to active question or option choice. DO NOT DELETE!';
          }

          return {
            url: b.url,
            pathname: b.pathname,
            size: b.size,
            sizeKB: (b.size / 1024).toFixed(2),
            uploadedAt: b.uploadedAt,
            isProtected,
            protectedType,
            protectionBadge,
            protectionNote
          };
        });
        blobTotalBytes = blobFiles.reduce((acc, file) => acc + (file.size || 0), 0);
        blobUsagePercent = Math.min(100, (blobTotalBytes / BLOB_LIMIT_BYTES) * 100);
      }
    } catch (err) {
      console.error('Error fetching Vercel Blob stats:', err);
    }

    // 4. Intimation Health Status calculation
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
