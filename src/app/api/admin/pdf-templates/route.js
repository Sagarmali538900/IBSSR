import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { PdfTemplate } from '@/lib/models';

const BASE_URL = 'https://ibssr.vercel.app';

// Default templates — seeded from public/uploads if not yet in DB
const DEFAULT_TEMPLATES = [
  { key: 'cover',        label: 'Cover Page',             imageUrl: `${BASE_URL}/uploads/template_cover.jpg` },
  { key: 'key_benefits', label: 'Key Benefits Page',      imageUrl: `${BASE_URL}/uploads/template_key_benefits.jpg` },
  { key: 'career_model', label: 'Career Saathi Model',    imageUrl: `${BASE_URL}/uploads/template_iceberg.jpg` },
  { key: 'back_cover',   label: 'Back Cover Page',        imageUrl: `${BASE_URL}/uploads/template_back_cover.jpg` },
];

// GET — returns all 4 templates, seeding defaults if missing
export async function GET() {
  try {
    await dbConnect();

    // Seed any missing defaults
    for (const tpl of DEFAULT_TEMPLATES) {
      await PdfTemplate.findOneAndUpdate(
        { key: tpl.key },
        { $setOnInsert: { label: tpl.label, imageUrl: tpl.imageUrl, updatedAt: new Date() } },
        { upsert: true, new: true }
      );
    }

    const templates = await PdfTemplate.find({}).sort({ key: 1 });
    return NextResponse.json({ templates });
  } catch (err) {
    console.error('pdf-templates GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — upsert a template image URL
// Body: { key: 'cover', imageUrl: 'https://...' }
export async function POST(request) {
  try {
    await dbConnect();
    const { key, imageUrl } = await request.json();

    if (!key || !imageUrl) {
      return NextResponse.json({ error: 'key and imageUrl are required' }, { status: 400 });
    }

    const updated = await PdfTemplate.findOneAndUpdate(
      { key },
      { imageUrl, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, template: updated });
  } catch (err) {
    console.error('pdf-templates POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
