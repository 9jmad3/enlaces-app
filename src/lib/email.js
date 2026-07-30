import { createHash } from 'node:crypto';

const resendApiUrl = 'https://api.resend.com/emails';

export function isEmailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function getSiteUrl() {
  return (process.env.SITE_URL || 'http://localhost:4321').replace(/\/+$/, '');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function emailLayout({ preheading, heading, body, buttonLabel, buttonUrl }) {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:32px 16px;background:#f7f4ed;color:#17201d;font-family:Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;padding:32px;border:1px solid #dcd8ce;border-radius:20px;background:#fffdf8">
      <p style="margin:0 0 20px;color:#b93721;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">${escapeHtml(preheading)}</p>
      <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:38px;line-height:1">${escapeHtml(heading)}</h1>
      <div style="color:#515c58;font-size:15px;line-height:1.7">${body}</div>
      <a href="${escapeHtml(buttonUrl)}" style="display:inline-block;margin-top:24px;padding:14px 22px;border-radius:999px;background:#e65336;color:#fff;text-decoration:none;font-weight:700">${escapeHtml(buttonLabel)}</a>
      <p style="margin:26px 0 0;color:#7b8581;font-size:12px;line-height:1.6">Si no has solicitado esta acción, puedes ignorar este correo.</p>
    </div>
  </body>
</html>`;
}

export async function sendEmail({ to, subject, html, text, idempotencyKey }) {
  if (!isEmailDeliveryConfigured()) return false;

  const response = await fetch(resendApiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend rechazo el correo (${response.status}): ${detail.slice(0, 300)}`);
  }

  return true;
}

function idempotencyKey(kind, token) {
  return `nexo-${kind}-${createHash('sha256').update(token).digest('hex').slice(0, 32)}`;
}

export function sendVerificationEmail({ email, displayName, token, isEmailChange = false }) {
  const url = `${getSiteUrl()}/verificar-correo?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(displayName || 'tu espacio');
  const heading = isEmailChange ? 'Confirma tu nuevo correo.' : 'Confirma que eres tú.';
  return sendEmail({
    to: email,
    subject: isEmailChange ? 'Confirma tu nuevo correo en Nexo' : 'Verifica tu correo en Nexo',
    html: emailLayout({
      preheading: 'Seguridad de tu cuenta',
      heading,
      body: `<p>Hola, ${safeName}. Pulsa el botón para confirmar esta dirección de correo.</p><p>El enlace caduca por seguridad.</p>`,
      buttonLabel: 'Confirmar correo',
      buttonUrl: url,
    }),
    text: `${heading}\n\nConfirma tu correo en ${url}\n\nSi no has solicitado esta acción, ignora el mensaje.`,
    idempotencyKey: idempotencyKey(isEmailChange ? 'email-change' : 'verify', token),
  });
}

export function sendPasswordResetEmail({ email, displayName, token }) {
  const url = `${getSiteUrl()}/restablecer-contrasena?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(displayName || 'tu espacio');
  return sendEmail({
    to: email,
    subject: 'Restablece tu contraseña de Nexo',
    html: emailLayout({
      preheading: 'Recuperación de cuenta',
      heading: 'Crea una nueva contraseña.',
      body: `<p>Hola, ${safeName}. Hemos recibido una solicitud para recuperar tu cuenta.</p><p>Este enlace caduca en 30 minutos y solo puede utilizarse una vez.</p>`,
      buttonLabel: 'Cambiar contraseña',
      buttonUrl: url,
    }),
    text: `Restablece tu contraseña de Nexo en ${url}\n\nEl enlace caduca en 30 minutos. Si no lo has solicitado, ignora el mensaje.`,
    idempotencyKey: idempotencyKey('reset', token),
  });
}
