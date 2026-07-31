import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAdminDirectoryParams } from '../src/lib/admin.js';

test('normalizes admin user directory filters', () => {
  assert.deepEqual(normalizeAdminDirectoryParams('  jose  ', '2'), {
    search: 'jose',
    page: 2,
    pageSize: 25,
  });
});

test('falls back to the first admin directory page', () => {
  assert.equal(normalizeAdminDirectoryParams('', '-3').page, 1);
  assert.equal(normalizeAdminDirectoryParams('', 'invalid').page, 1);
  assert.equal(normalizeAdminDirectoryParams('a'.repeat(100), '1').search.length, 80);
});
