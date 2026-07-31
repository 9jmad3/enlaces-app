import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  isEmailDeliveryConfigured,
  sendEmail,
  sendOwnerModerationEmail,
  sendReporterDecisionEmail,
  sendReportReceiptEmail,
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

test('renders the complete moderation email flow safely', async () => {
  configureEmail();
  process.env.SITE_URL = 'https://trazli.com';
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    return { ok: true };
  };

  await sendReportReceiptEmail({
    email: 'reporter@example.com',
    reportId: '12345678-1234-1234-1234-123456789abc',
    profileSlug: 'perfil',
    reasonLabel: 'Fraude o estafa',
  });
  await sendReporterDecisionEmail({
    email: 'reporter@example.com',
    actionId: 'action-reporter',
    reportId: '12345678-1234-1234-1234-123456789abc',
    profileSlug: 'perfil',
    action: 'suspend',
    reasonLabel: 'Fraude o estafa',
    publicReason: 'El enlace simulaba un servicio ajeno.',
    ruleLabel: 'Condiciones de uso: prohibición de contenido fraudulento.',
  });
  await sendOwnerModerationEmail({
    email: 'owner@example.com',
    displayName: '<José>',
    actionId: 'action-owner',
    profileSlug: 'perfil',
    action: 'suspend',
    reasonLabel: 'Fraude o estafa',
    publicReason: 'El enlace simulaba un servicio ajeno.',
    ruleLabel: 'Condiciones de uso: prohibición de contenido fraudulento.',
  });

  assert.equal(requests.length, 3);
  assert.match(requests[0].body.subject, /denuncia/i);
  assert.match(requests[1].body.text, /Solicitar una revisión/i);
  assert.match(requests[2].body.text, /Norma aplicada:/);
  assert.doesNotMatch(requests[2].body.html, /<José>/);
  assert.match(requests[2].body.html, /&lt;José&gt;/);
  assert.match(
    requests[2].options.headers['Idempotency-Key'],
    /^trazli-owner-moderation-[a-f0-9]{32}$/,
  );
});
