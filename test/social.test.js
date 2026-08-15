import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSocialUrl } from '../src/lib/social.js';

test('normaliza perfiles sociales sin protocolo', () => {
  assert.equal(
    normalizeSocialUrl('instagram', 'instagram.com/jmaledom'),
    'https://instagram.com/jmaledom',
  );
  assert.equal(
    normalizeSocialUrl('tiktok', 'www.tiktok.com/@jmaledomtk'),
    'https://www.tiktok.com/@jmaledomtk',
  );
});

test('admite canales de YouTube y enlaces cortos', () => {
  assert.equal(
    normalizeSocialUrl('youtube', 'youtube.com/@trazli'),
    'https://youtube.com/@trazli',
  );
  assert.equal(
    normalizeSocialUrl('youtube', 'https://youtu.be/abc123'),
    'https://youtu.be/abc123',
  );
});

test('rechaza protocolos inseguros y dominios que suplantan plataformas', () => {
  assert.equal(normalizeSocialUrl('instagram', 'http://instagram.com/jmaledom'), '');
  assert.equal(normalizeSocialUrl('instagram', 'https://instagram.com.example.com/jmaledom'), '');
  assert.equal(normalizeSocialUrl('tiktok', 'javascript:alert(1)'), '');
  assert.equal(normalizeSocialUrl('unknown', 'https://example.com'), '');
});
