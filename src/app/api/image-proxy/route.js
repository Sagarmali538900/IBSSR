import { NextResponse } from 'next/server';

/**
 * GET /api/image-proxy?url=<blob-url>
 *
 * Proxies a private Vercel Blob image to the browser by fetching it
 * server-side using the BLOB_READ_WRITE_TOKEN.
 * This is required because private blob URLs need an Authorization header
 * which browsers cannot send via <img> tags.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const blobUrl = searchParams.get('url');

    if (!blobUrl) {
      return new NextResponse('Missing url parameter', { status: 400 });
    }

    // Only allow fetching from Vercel Blob storage domains
    const allowedDomains = [
      'blob.vercel-storage.com',
      'public.blob.vercel-storage.com',
    ];
    const urlObj = new URL(blobUrl);
    const isAllowed = allowedDomains.some(d => urlObj.hostname.endsWith(d));
    if (!isAllowed) {
      return new NextResponse('Forbidden: URL not from allowed domain', { status: 403 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const response = await fetch(blobUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      return new NextResponse('Image not found', { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache image in browser for 1 hour
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    return new NextResponse('Proxy error: ' + error.message, { status: 500 });
  }
}
