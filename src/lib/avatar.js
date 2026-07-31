import { createHash } from 'node:crypto';
import sharp from 'sharp';

export const MAX_AVATAR_BYTES = 12 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export class AvatarUploadError extends Error {}

export function normalizeAvatarPosition(value, fallback = 50) {
  const position = Number.parseInt(String(value), 10);
  return Number.isFinite(position) ? Math.min(100, Math.max(0, position)) : fallback;
}

function matchesFileSignature(bytes, contentType) {
  if (contentType === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (contentType === 'image/png') {
    return bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  }

  if (contentType === 'image/webp') {
    return bytes.subarray(0, 4).toString('ascii') === 'RIFF'
      && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  }

  return false;
}

export async function parseAvatarUpload(file) {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) {
    return null;
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    throw new AvatarUploadError('La foto debe ser JPG, PNG o WebP.');
  }

  if (file.size > MAX_AVATAR_BYTES) {
    throw new AvatarUploadError('La foto no puede superar los 12 MB.');
  }

  const content = Buffer.from(await file.arrayBuffer());
  if (!matchesFileSignature(content, file.type)) {
    throw new AvatarUploadError('El archivo seleccionado no es una imagen valida.');
  }

  try {
    const optimizedContent = await sharp(content, { limitInputPixels: 80_000_000 })
      .rotate()
      .resize({
        width: 1800,
        height: 1800,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 86, effort: 4 })
      .toBuffer();

    return {
      content: optimizedContent,
      contentType: 'image/webp',
      etag: createHash('sha256').update(optimizedContent).digest('hex'),
    };
  } catch {
    throw new AvatarUploadError('No hemos podido procesar esta imagen. Prueba con otra foto.');
  }
}
