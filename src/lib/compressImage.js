/**
 * Compresses an image File using the browser's Canvas API.
 * Resizes to max 1200px wide/tall and compresses to JPEG at 80% quality.
 * This ensures uploaded images stay well under Vercel's 4.5MB body limit.
 *
 * @param {File} file - The original image File object
 * @param {number} maxSize - Max width/height in pixels (default 1200)
 * @param {number} quality - JPEG quality 0-1 (default 0.8)
 * @returns {Promise<File>} - A new compressed File object
 */
export async function compressImage(file, maxSize = 1200, quality = 0.8) {
  // Skip non-image files or already small files (< 200KB)
  if (!file || !file.type.startsWith('image/') || file.size < 200 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions keeping aspect ratio
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file); // fallback to original if compression fails
            return;
          }
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, '.jpg'), // rename to .jpg
            { type: 'image/jpeg', lastModified: Date.now() }
          );
          console.log(
            `Compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`
          );
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback to original on error
    };

    img.src = url;
  });
}
