import {
  setSessionCookie,
  updateUserPassword,
  verifyUserPassword,
} from '../../../lib/auth.js';
import { getClientIp, isRateLimited, sameOrigin } from '../../../lib/security.js';

export const prerender = false;

function accountError(message) {
  return `/app/cuenta?error=${encodeURIComponent(message)}`;
}

export async function POST({ request, cookies, locals, redirect }) {
  if (!sameOrigin(request)) {
    return new Response('Solicitud no permitida', { status: 403 });
  }
  if (!locals.user) return redirect('/login?next=/app/cuenta');

  const ip = getClientIp(request);
  if (await isRateLimited(`account-password:${locals.user.id}:${ip}`, {
    limit: 6,
    windowMs: 30 * 60_000,
  })) {
    return redirect(accountError('Demasiados intentos. Espera unos minutos.'));
  }

  const form = await request.formData();
  const currentPassword = String(form.get('currentPassword') || '');
  const password = String(form.get('password') || '');
  const passwordConfirmation = String(form.get('passwordConfirmation') || '');

  if (!currentPassword) {
    return redirect(accountError('Escribe tu contraseña actual.'));
  }
  if (password.length < 8 || password.length > 72) {
    return redirect(accountError('La nueva contraseña debe tener entre 8 y 72 caracteres.'));
  }
  if (password !== passwordConfirmation) {
    return redirect(accountError('Las nuevas contraseñas no coinciden.'));
  }
  if (password === currentPassword) {
    return redirect(accountError('La nueva contraseña debe ser diferente.'));
  }

  try {
    if (!(await verifyUserPassword(locals.user.id, currentPassword))) {
      return redirect(accountError('La contraseña actual no es correcta.'));
    }

    const session = await updateUserPassword(locals.user.id, password);
    setSessionCookie(cookies, session);
    return redirect('/app/cuenta?passwordUpdated=1');
  } catch (error) {
    console.error('No se pudo actualizar la contraseña', error);
    return redirect(accountError('No hemos podido actualizar la contraseña.'));
  }
}
