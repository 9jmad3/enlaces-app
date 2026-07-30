import { verifyUserPassword } from '../../../lib/auth.js';
import { beginEmailChange } from '../../../lib/account-tokens.js';
import {
  isEmailDeliveryConfigured,
  sendVerificationEmail,
} from '../../../lib/email.js';
import { normalizeEmail, validEmail } from '../../../lib/validation.js';
import { getClientIp, isRateLimited, sameOrigin } from '../../../lib/security.js';

export const prerender = false;

function accountError(message) {
  return `/app/cuenta?error=${encodeURIComponent(message)}`;
}

export async function POST({ request, locals, redirect }) {
  if (!sameOrigin(request)) {
    return new Response('Solicitud no permitida', { status: 403 });
  }
  if (!locals.user) return redirect('/login?next=/app/cuenta');
  if (!isEmailDeliveryConfigured()) {
    return redirect(accountError('El envío de correo todavía no está configurado.'));
  }

  const ip = getClientIp(request);
  if (await isRateLimited(`account-email:${locals.user.id}:${ip}`, {
    limit: 8,
    windowMs: 30 * 60_000,
  })) {
    return redirect(accountError('Demasiados intentos. Espera unos minutos.'));
  }

  const form = await request.formData();
  const email = normalizeEmail(form.get('email'));
  const currentPassword = String(form.get('currentPassword') || '');

  if (!validEmail(email)) {
    return redirect(accountError('Escribe un correo electrónico válido.'));
  }
  if (!currentPassword) {
    return redirect(accountError('Escribe tu contraseña actual.'));
  }

  try {
    if (!(await verifyUserPassword(locals.user.id, currentPassword))) {
      return redirect(accountError('La contraseña actual no es correcta.'));
    }
    if (email === locals.user.email) {
      return redirect(accountError('Ese correo ya está asociado a tu cuenta.'));
    }

    const token = await beginEmailChange(locals.user.id, email);
    await sendVerificationEmail({
      email,
      displayName: locals.user.display_name,
      token,
      isEmailChange: true,
    });
    return redirect('/app/cuenta?emailPending=1');
  } catch (error) {
    if (error?.code === '23505' || error?.code === 'EMAIL_TAKEN') {
      return redirect(accountError('Ese correo ya está asociado a otra cuenta.'));
    }
    console.error('No se pudo actualizar el correo', error);
    return redirect(accountError('No hemos podido actualizar el correo.'));
  }
}
