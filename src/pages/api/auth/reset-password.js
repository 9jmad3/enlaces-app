import { resetPasswordWithToken } from '../../../lib/account-tokens.js';
import { setSessionCookie } from '../../../lib/auth.js';
import { getClientIp, isRateLimited, sameOrigin } from '../../../lib/security.js';

export const prerender = false;

function resetError(token, message) {
  return `/restablecer-contrasena?token=${encodeURIComponent(token)}&error=${encodeURIComponent(message)}`;
}

export async function POST({ request, cookies, redirect }) {
  if (!sameOrigin(request)) {
    return new Response('Solicitud no permitida', { status: 403 });
  }

  const ip = getClientIp(request);
  if (await isRateLimited(`reset-password:${ip}`, {
    limit: 8,
    windowMs: 30 * 60_000,
  })) {
    return redirect('/recuperar-contrasena?error=' + encodeURIComponent('Demasiados intentos.'));
  }

  const form = await request.formData();
  const token = String(form.get('token') || '');
  const password = String(form.get('password') || '');
  const passwordConfirmation = String(form.get('passwordConfirmation') || '');

  if (password.length < 8 || password.length > 72) {
    return redirect(resetError(token, 'La contraseña debe tener entre 8 y 72 caracteres.'));
  }
  if (password !== passwordConfirmation) {
    return redirect(resetError(token, 'Las contraseñas no coinciden.'));
  }

  try {
    const result = await resetPasswordWithToken(token, password);
    if (!result) {
      return redirect('/recuperar-contrasena?error=' + encodeURIComponent('El enlace ha caducado o ya se ha utilizado.'));
    }
    setSessionCookie(cookies, result.session);
    return redirect('/app?passwordReset=1');
  } catch (error) {
    console.error('No se pudo restablecer la contraseña', error);
    return redirect(resetError(token, 'No hemos podido cambiar la contraseña.'));
  }
}
