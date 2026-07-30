import { updateUserEmail, verifyUserPassword } from '../../../lib/auth.js';
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

    await updateUserEmail(locals.user.id, email);
    return redirect('/app/cuenta?emailUpdated=1');
  } catch (error) {
    if (error?.code === '23505') {
      return redirect(accountError('Ese correo ya está asociado a otra cuenta.'));
    }
    console.error('No se pudo actualizar el correo', error);
    return redirect(accountError('No hemos podido actualizar el correo.'));
  }
}
