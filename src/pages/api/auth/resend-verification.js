import { createEmailVerificationToken } from '../../../lib/account-tokens.js';
import {
  isEmailDeliveryConfigured,
  sendVerificationEmail,
} from '../../../lib/email.js';
import { getClientIp, isRateLimited, sameOrigin } from '../../../lib/security.js';

export const prerender = false;

export async function POST({ request, locals, redirect }) {
  if (!sameOrigin(request)) {
    return new Response('Solicitud no permitida', { status: 403 });
  }
  if (!locals.user) return redirect('/login?next=/app');
  if (locals.user.email_verified_at) return redirect('/app?verified=1');

  const ip = getClientIp(request);
  if (await isRateLimited(`resend-verification:${locals.user.id}:${ip}`, {
    limit: 3,
    windowMs: 60 * 60_000,
  })) {
    return redirect('/app?error=' + encodeURIComponent('Espera antes de solicitar otro correo.'));
  }
  if (!isEmailDeliveryConfigured()) {
    return redirect('/app?error=' + encodeURIComponent('El envío de correo todavía no está configurado.'));
  }

  try {
    const token = await createEmailVerificationToken(locals.user.id);
    await sendVerificationEmail({
      email: locals.user.email,
      displayName: locals.user.display_name,
      token,
    });
    return redirect('/app?verificationSent=1');
  } catch (error) {
    console.error('No se pudo reenviar la verificacion', error);
    return redirect('/app?error=' + encodeURIComponent('No hemos podido enviar el correo.'));
  }
}
