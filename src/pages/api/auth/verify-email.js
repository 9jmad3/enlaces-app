import { consumeEmailVerificationToken } from '../../../lib/account-tokens.js';
import { getClientIp, isRateLimited, sameOrigin } from '../../../lib/security.js';

export const prerender = false;

export async function POST({ request, locals, redirect }) {
  if (!sameOrigin(request)) {
    return new Response('Solicitud no permitida', { status: 403 });
  }

  const ip = getClientIp(request);
  if (await isRateLimited(`verify-email:${ip}`, {
    limit: 10,
    windowMs: 30 * 60_000,
  })) {
    return redirect('/verificar-correo?error=' + encodeURIComponent('Demasiados intentos.'));
  }

  const form = await request.formData();
  const token = String(form.get('token') || '');
  try {
    const result = await consumeEmailVerificationToken(token);
    if (!result) {
      return redirect('/verificar-correo?error=' + encodeURIComponent('El enlace ha caducado o ya se ha utilizado.'));
    }

    if (locals.user) {
      return redirect(result.purpose === 'verify_email_change'
        ? '/app/cuenta?emailUpdated=1'
        : '/app?verified=1');
    }
    return redirect('/login?verified=1');
  } catch (error) {
    if (error?.code === '23505') {
      return redirect('/verificar-correo?error=' + encodeURIComponent('Ese correo ya está asociado a otra cuenta.'));
    }
    console.error('No se pudo verificar el correo', error);
    return redirect('/verificar-correo?error=' + encodeURIComponent('No hemos podido verificar el correo.'));
  }
}
