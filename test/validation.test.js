import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSlug,
  RESERVED_SLUGS,
  validateSlug,
} from '../src/lib/validation.js';

test('reserves application routes and protected identities', () => {
  for (const slug of [
    'app',
    'api',
    'aviso-legal',
    'restablecer-contrasena',
    'admin',
    'nexo',
    'trazli',
    'trazliapp',
    'paypal',
  ]) {
    assert.equal(
      validateSlug(slug),
      'Ese nombre está reservado por Trazli.',
      `${slug} should be reserved`,
    );
  }
});

test('reserves every configured slug after normalization', () => {
  for (const slug of RESERVED_SLUGS) {
    assert.equal(validateSlug(normalizeSlug(slug)), 'Ese nombre está reservado por Trazli.');
  }
});

test('keeps ordinary profile names available', () => {
  for (const slug of ['jmaledom', 'maria-garcia', 'estudio_23', 'carlosfit']) {
    assert.equal(validateSlug(slug), '', `${slug} should remain available`);
  }
});

test('normalizes case and accents before validation', () => {
  assert.equal(normalizeSlug('  Configuración  '), 'configuracion');
  assert.equal(validateSlug(normalizeSlug('  Configuración  ')), 'Ese nombre está reservado por Trazli.');
});
