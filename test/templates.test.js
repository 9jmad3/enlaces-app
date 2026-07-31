import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeTemplateId, PROFILE_TEMPLATES } from '../src/lib/templates.js';

test('all public profile templates are accepted', () => {
  assert.deepEqual(PROFILE_TEMPLATES, ['studio', 'pulse', 'aura', 'frame']);

  for (const template of PROFILE_TEMPLATES) {
    assert.equal(normalizeTemplateId(template), template);
  }
});

test('unknown profile templates fall back to studio', () => {
  assert.equal(normalizeTemplateId('unknown'), 'studio');
  assert.equal(normalizeTemplateId('Aura'), 'studio');
  assert.equal(normalizeTemplateId(undefined), 'studio');
});
