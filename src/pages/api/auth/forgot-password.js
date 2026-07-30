import { createPasswordResetToken } from '../../../lib/account-tokens.js';
import {
  isEmailDeliveryConfigured,
  sendPasswordResetEmail,
} from '../../../lib/email.js';
import { normalizeEmail, validEmail } from '../../../lib/validation.js';
import { getClientIp, isRateLimited, sameOrigin } from '../../../lib/security.js';

export const prerender = false;

function recoveryError(message) {
  return `/recuperar-contrasena?error=${encodeURIComponent(message)}`;
}

export async function POST({ request, redirect }) {
  if (!sameOrigin(request)) {
    return new Response('Solicitud no permitida', { status: 403 });
  }

  const form = await request.formData();
  const email = normalizeEmail(form.get('email'));
  if (!validEmail(email)) {
    return redirect(recoveryError('Escribe un correo electrónico válido.'));
  }

  const ip = getClientIp(request);
  if (await isRateLimited(`forgot-password:${ip}`, {
    limit: 8,
    windowMs: 30 * 60_000,
  })) {
    return redirect('/recuperar-contrasena?sent=1');
  }

  if (isEmailDeliveryConfigured()) {
    try {
      const result = await createPasswordResetToken(email);
      if (result) {
        await sendPasswordResetEmail({
          email: result.user.email,
          displayName: result.user.display_name,
          token: result.token,
        });
      }
    } catch (error) {
      console.error('No se pudo enviar la recuperacion de contraseña', error);
    }
  }

  // The response is intentionally identical whether the account exists or not.
  return redirect('/recuperar-contrasena?sent=1');
}
