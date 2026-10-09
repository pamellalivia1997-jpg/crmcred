/**
 * Client-Side Image and Document Compression Utility
 * Optimizes attachments to conserve Google Drive storage space.
 * Designated target Google Drive email: liviacredconsignado@gmail.com
 */

export interface CompressedFileResult {
  fileName: string;
  originalSize: number;
  compressedSize: number;
  originalSizeFormatted: string;
  compressedSizeFormatted: string;
  reductionPercentage: number;
  dataUrl: string;
  mimeType: string;
  driveAccount: string;
}

export const GOOGLE_DRIVE_DESTINATION_EMAIL = 'liviacredconsignado@gmail.com';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Compresses an image file (JPEG, PNG, WebP) using browser HTML5 canvas
 * downsampling to a maximum resolution and JPEG compression quality.
 */
export async function compressFileForDrive(
  file: File,
  maxDimension = 1600,
  quality = 0.72
): Promise<CompressedFileResult> {
  const originalSize = file.size;

  // Non-image files (e.g. PDF, documents) cannot be re-rendered on canvas, but we record their metadata
  if (!file.type.startsWith('image/')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          fileName: file.name,
          originalSize,
          compressedSize: originalSize,
          originalSizeFormatted: formatBytes(originalSize),
          compressedSizeFormatted: formatBytes(originalSize),
          reductionPercentage: 0,
          dataUrl: String(reader.result || ''),
          mimeType: file.type || 'application/pdf',
          driveAccount: GOOGLE_DRIVE_DESTINATION_EMAIL
        });
      };
      reader.readAsDataURL(file);
    });
  }

  // Process image
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Erro ao processar imagem'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserved downsampling
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          // Fallback if canvas context fails
          resolve({
            fileName: file.name,
            originalSize,
            compressedSize: originalSize,
            originalSizeFormatted: formatBytes(originalSize),
            compressedSizeFormatted: formatBytes(originalSize),
            reductionPercentage: 0,
            dataUrl: String(e.target?.result || ''),
            mimeType: file.type,
            driveAccount: GOOGLE_DRIVE_DESTINATION_EMAIL
          });
          return;
        }

        // Fill white background in case of transparent PNG converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Compress as image/jpeg
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

        // Approximate compressed size in bytes from base64
        const stringLength = compressedDataUrl.length - 'data:image/jpeg;base64,'.length;
        const compressedSize = Math.round((stringLength * 3) / 4);
        const reductionPercentage = Math.max(
          0,
          Math.round(((originalSize - compressedSize) / originalSize) * 100)
        );

        resolve({
          fileName: file.name.replace(/\.[^/.]+$/, '') + '.jpg',
          originalSize,
          compressedSize,
          originalSizeFormatted: formatBytes(originalSize),
          compressedSizeFormatted: formatBytes(compressedSize),
          reductionPercentage,
          dataUrl: compressedDataUrl,
          mimeType: 'image/jpeg',
          driveAccount: GOOGLE_DRIVE_DESTINATION_EMAIL
        });
      };
      img.src = String(e.target?.result || '');
    };
    reader.readAsDataURL(file);
  });
}
