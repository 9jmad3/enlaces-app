import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {
  MAX_AVATAR_BYTES,
  normalizeAvatarPosition,
  parseAvatarUpload,
} from '../src/lib/avatar.js';

test('accepts avatar uploads up to 12 MB', () => {
  assert.equal(MAX_AVATAR_BYTES, 12 * 1024 * 1024);
});

test('keeps avatar focal points inside the image', () => {
  assert.equal(normalizeAvatarPosition('72', 50), 72);
  assert.equal(normalizeAvatarPosition('-20', 50), 0);
  assert.equal(normalizeAvatarPosition('180', 50), 100);
  assert.equal(normalizeAvatarPosition('invalid', 20), 20);
});

test('optimizes uploaded avatars as WebP', async () => {
  const source = await sharp({
    create: {
      width: 120,
      height: 80,
      channels: 3,
      background: '#e65336',
    },
  }).png().toBuffer();

  const avatar = await parseAvatarUpload({
    size: source.length,
    type: 'image/png',
    arrayBuffer: async () => source,
  });

  assert.equal(avatar.contentType, 'image/webp');
  assert.equal((await sharp(avatar.content).metadata()).format, 'webp');
});
