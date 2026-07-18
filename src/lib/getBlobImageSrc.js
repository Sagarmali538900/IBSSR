/**
 * Returns the correct src for a Vercel Blob image.
 * Private blob URLs cannot be loaded directly by the browser,
 * so we route them through our /api/image-proxy endpoint.
 *
 * @param {string|null} url - The raw blob URL stored in MongoDB
 * @returns {string|null} - The proxied URL safe to use in <img src={...}>
 */
export function getBlobImageSrc(url) {
  if (!url) return null;
  // If it's a blob URL, proxy it. Otherwise return as-is (e.g. local /uploads/ paths).
  if (url.includes('vercel-storage.com')) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}
