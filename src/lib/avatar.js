import { createHash } from 'node:crypto';

export const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export class AvatarUploadError extends Error {}

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
    throw new AvatarUploadError('La foto no puede superar los 3 MB.');
  }

  const content = Buffer.from(await file.arrayBuffer());
  if (!matchesFileSignature(content, file.type)) {
    throw new AvatarUploadError('El archivo seleccionado no es una imagen valida.');
  }

  return {
    content,
    contentType: file.type,
    etag: createHash('sha256').update(content).digest('hex'),
  };
}
