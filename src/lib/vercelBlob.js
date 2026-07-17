import { put } from '@vercel/blob';

/**
 * Uploads a file to Vercel Blob Storage and returns the public CDN URL.
 */
export async function uploadToVercelBlob(file) {
  if (!file || typeof file === 'string' || !file.name || file.size === 0) {
    return null;
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  // Create unique filename inside an uploads folder
  const filename = `uploads/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

  const blob = await put(filename, buffer, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN
  });

  return blob.url;
}
