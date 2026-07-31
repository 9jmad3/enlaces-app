import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  isEmailDeliveryConfigured,
  sendEmail,
} from '../src/lib/email.js';

const originalFetch = globalThis.fetch;
const originalEnv = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
};

function configureEmail() {
  process.env.RESEND_API_KEY = 're_test_key';
  process.env.EMAIL_FROM = 'Trazli <notificaciones@mail.trazli.com>';
  process.env.EMAIL_REPLY_TO = 'hola@trazli.com';
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('requires a reply-to address before enabling email delivery', () => {
  configureEmail();
  delete process.env.EMAIL_REPLY_TO;

  assert.equal(isEmailDeliveryConfigured(), false);
});

test('sends transactional email with the official reply-to address', async () => {
  configureEmail();
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true };
  };

  const sent = await sendEmail({
    to: 'persona@example.com',
    subject: 'Confirma tu cuenta',
    html: '<p>Confirma tu cuenta</p>',
    text: 'Confirma tu cuenta',
    idempotencyKey: 'trazli-test-message',
  });

  assert.equal(sent, true);
  assert.equal(request.url, 'https://api.resend.com/emails');
  assert.equal(request.options.headers.Authorization, 'Bearer re_test_key');
  assert.equal(request.options.headers['Idempotency-Key'], 'trazli-test-message');
  assert.deepEqual(JSON.parse(request.options.body), {
    from: 'Trazli <notificaciones@mail.trazli.com>',
    reply_to: 'hola@trazli.com',
    to: ['persona@example.com'],
    subject: 'Confirma tu cuenta',
    html: '<p>Confirma tu cuenta</p>',
    text: 'Confirma tu cuenta',
  });
});
