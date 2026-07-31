import { createHash } from 'node:crypto';

const resendApiUrl = 'https://api.resend.com/emails';

export function isEmailDeliveryConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY
      && process.env.EMAIL_FROM
      && process.env.EMAIL_REPLY_TO,
  );
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

function emailLayout({
  preheading,
  heading,
  body,
  buttonLabel,
  buttonUrl,
  footer = 'Si no has solicitado esta acción, puedes ignorar este correo.',
}) {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:32px 16px;background:#f7f4ed;color:#17201d;font-family:Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;padding:32px;border:1px solid #dcd8ce;border-radius:20px;background:#fffdf8">
      <p style="margin:0 0 20px;color:#b93721;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">${escapeHtml(preheading)}</p>
      <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:38px;line-height:1">${escapeHtml(heading)}</h1>
      <div style="color:#515c58;font-size:15px;line-height:1.7">${body}</div>
      <a href="${escapeHtml(buttonUrl)}" style="display:inline-block;margin-top:24px;padding:14px 22px;border-radius:999px;background:#e65336;color:#fff;text-decoration:none;font-weight:700">${escapeHtml(buttonLabel)}</a>
      <p style="margin:26px 0 0;color:#7b8581;font-size:12px;line-height:1.6">${escapeHtml(footer)}</p>
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
      reply_to: process.env.EMAIL_REPLY_TO,
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
  return `trazli-${kind}-${createHash('sha256').update(token).digest('hex').slice(0, 32)}`;
}

export function sendVerificationEmail({ email, displayName, token, isEmailChange = false }) {
  const url = `${getSiteUrl()}/verificar-correo?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(displayName || 'tu espacio');
  const heading = isEmailChange ? 'Confirma tu nuevo correo.' : 'Confirma que eres tú.';
  return sendEmail({
    to: email,
    subject: isEmailChange ? 'Confirma tu nuevo correo en Trazli' : 'Verifica tu correo en Trazli',
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
    subject: 'Restablece tu contraseña de Trazli',
    html: emailLayout({
      preheading: 'Recuperación de cuenta',
      heading: 'Crea una nueva contraseña.',
      body: `<p>Hola, ${safeName}. Hemos recibido una solicitud para recuperar tu cuenta.</p><p>Este enlace caduca en 30 minutos y solo puede utilizarse una vez.</p>`,
      buttonLabel: 'Cambiar contraseña',
      buttonUrl: url,
    }),
    text: `Restablece tu contraseña de Trazli en ${url}\n\nEl enlace caduca en 30 minutos. Si no lo has solicitado, ignora el mensaje.`,
    idempotencyKey: idempotencyKey('reset', token),
  });
}

export function sendReportReceiptEmail({
  email,
  reportId,
  profileSlug,
  reasonLabel,
}) {
  const reference = reportId.slice(0, 8).toUpperCase();
  return sendEmail({
    to: email,
    subject: `Hemos recibido tu denuncia sobre @${profileSlug}`,
    html: emailLayout({
      preheading: `Denuncia ${reference}`,
      heading: 'Gracias por avisarnos.',
      body: `<p>Hemos recibido tu denuncia sobre <strong>@${escapeHtml(profileSlug)}</strong> por «${escapeHtml(reasonLabel)}».</p><p>La revisaremos cuidadosamente y te comunicaremos la decisión final en esta dirección.</p>`,
      buttonLabel: 'Consultar las condiciones',
      buttonUrl: `${getSiteUrl()}/condiciones#moderacion-suspension`,
      footer: `Referencia ${reference}. Puedes responder a este correo si necesitas aportar información adicional.`,
    }),
    text: `Hemos recibido tu denuncia sobre @${profileSlug} por "${reasonLabel}".\n\nReferencia: ${reference}.\nTe comunicaremos la decisión final en esta dirección.`,
    idempotencyKey: idempotencyKey('report-receipt', reportId),
  });
}

export function sendReporterDecisionEmail({
  email,
  actionId,
  reportId,
  profileSlug,
  action,
  reasonLabel,
  publicReason,
  ruleLabel,
}) {
  const reference = reportId.slice(0, 8).toUpperCase();
  const decisions = {
    dismiss: {
      subject: `Resolución de tu denuncia sobre @${profileSlug}`,
      heading: 'Hemos completado la revisión.',
      decision: 'No hemos restringido el perfil en este momento.',
    },
    suspend: {
      subject: `Hemos actuado sobre @${profileSlug}`,
      heading: 'Hemos completado la revisión.',
      decision: 'Hemos ocultado el perfil mientras se mantiene esta decisión.',
    },
    restore: {
      subject: `Actualización sobre @${profileSlug}`,
      heading: 'La decisión se ha actualizado.',
      decision: 'El perfil ha sido restaurado tras una nueva revisión.',
    },
  };
  const outcome = decisions[action];
  if (!outcome) return false;

  return sendEmail({
    to: email,
    subject: outcome.subject,
    html: emailLayout({
      preheading: `Resolución ${reference}`,
      heading: outcome.heading,
      body: `<p><strong>Decisión:</strong> ${escapeHtml(outcome.decision)}</p><p><strong>Motivo evaluado:</strong> ${escapeHtml(reasonLabel)}</p><p><strong>Explicación:</strong> ${escapeHtml(publicReason)}</p><p><strong>Norma aplicada:</strong> ${escapeHtml(ruleLabel)}</p>`,
      buttonLabel: 'Solicitar una revisión',
      buttonUrl: `mailto:${process.env.EMAIL_REPLY_TO}?subject=${encodeURIComponent(`Revisión denuncia ${reference}`)}`,
      footer: `Referencia ${reference}. Puedes solicitar una revisión respondiendo a este correo.`,
    }),
    text: `${outcome.heading}\n\nDecisión: ${outcome.decision}\nMotivo evaluado: ${reasonLabel}\nExplicación: ${publicReason}\nNorma aplicada: ${ruleLabel}\n\nReferencia: ${reference}. Puedes solicitar una revisión respondiendo a este correo.`,
    idempotencyKey: idempotencyKey('report-decision', `${actionId}:reporter`),
  });
}

export function sendOwnerModerationEmail({
  email,
  displayName,
  actionId,
  profileSlug,
  action,
  reasonLabel,
  publicReason,
  ruleLabel,
}) {
  const restored = action === 'restore';
  const heading = restored ? 'Tu perfil vuelve a estar publicado.' : 'Tu perfil ha sido ocultado.';
  const decision = restored
    ? `El perfil @${profileSlug} ha sido restaurado tras una nueva revisión.`
    : `Hemos restringido el acceso público al perfil @${profileSlug}.`;

  return sendEmail({
    to: email,
    subject: restored
      ? `Tu perfil @${profileSlug} ha sido restaurado`
      : `Información sobre tu perfil @${profileSlug}`,
    html: emailLayout({
      preheading: 'Decisión de moderación',
      heading,
      body: `<p>Hola, ${escapeHtml(displayName || profileSlug)}.</p><p><strong>Decisión:</strong> ${escapeHtml(decision)}</p><p><strong>Motivo:</strong> ${escapeHtml(reasonLabel)}</p><p><strong>Explicación:</strong> ${escapeHtml(publicReason)}</p><p><strong>Norma aplicada:</strong> ${escapeHtml(ruleLabel)}</p>`,
      buttonLabel: restored ? 'Abrir mi perfil' : 'Solicitar una revisión',
      buttonUrl: restored
        ? `${getSiteUrl()}/${encodeURIComponent(profileSlug)}`
        : `mailto:${process.env.EMAIL_REPLY_TO}?subject=${encodeURIComponent(`Revisión del perfil @${profileSlug}`)}`,
      footer: 'Puedes solicitar una revisión gratuita respondiendo a este correo o escribiendo a hola@trazli.com.',
    }),
    text: `${heading}\n\n${decision}\nMotivo: ${reasonLabel}\nExplicación: ${publicReason}\nNorma aplicada: ${ruleLabel}\n\nPuedes solicitar una revisión respondiendo a este correo.`,
    idempotencyKey: idempotencyKey('owner-moderation', `${actionId}:owner`),
  });
}
