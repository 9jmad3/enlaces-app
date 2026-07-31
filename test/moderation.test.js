import assert from 'node:assert/strict';
import test from 'node:test';

test('accepts only the supported report reasons', async () => {
  const { REPORT_REASONS, REPORT_RULES, isReportReason } = await import('../src/lib/moderation.js');

  assert.deepEqual(Object.keys(REPORT_REASONS), [
    'impersonation',
    'fraud',
    'illegal',
    'harassment',
    'spam',
    'other',
  ]);
  assert.equal(isReportReason('fraud'), true);
  assert.equal(isReportReason(''), false);
  assert.equal(isReportReason('__proto__'), false);
  assert.deepEqual(Object.keys(REPORT_RULES), Object.keys(REPORT_REASONS));
});

test('restricts moderation to configured email addresses', async () => {
  process.env.ADMIN_EMAILS = 'owner@example.com, hola@trazli.com';
  const { isAdmin } = await import('../src/lib/moderation.js?admin-test');

  assert.equal(isAdmin({ email: 'OWNER@example.com' }), true);
  assert.equal(isAdmin({ email: 'visitor@example.com' }), false);
  assert.equal(isAdmin(null), false);
  delete process.env.ADMIN_EMAILS;
});
