import {
  clearSessionCookie,
  deleteUserAccount,
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
  if (await isRateLimited(`account-delete:${locals.user.id}:${ip}`, {
    limit: 5,
    windowMs: 60 * 60_000,
  })) {
    return redirect(accountError('Demasiados intentos. Espera antes de volver a intentarlo.'));
  }

  const form = await request.formData();
  const currentPassword = String(form.get('currentPassword') || '');
  const confirmation = String(form.get('confirmation') || '').trim();

  if (confirmation !== 'ELIMINAR') {
    return redirect(accountError('Escribe ELIMINAR para confirmar el borrado.'));
  }

  try {
    if (!(await verifyUserPassword(locals.user.id, currentPassword))) {
      return redirect(accountError('La contraseña actual no es correcta.'));
    }

    await deleteUserAccount(locals.user.id);
    clearSessionCookie(cookies);
    return redirect('/?accountDeleted=1');
  } catch (error) {
    console.error('No se pudo eliminar la cuenta', error);
    return redirect(accountError('No hemos podido eliminar la cuenta.'));
  }
}
