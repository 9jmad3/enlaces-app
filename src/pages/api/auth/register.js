import {
  createAccount,
  createSession,
  setSessionCookie,
} from '../../../lib/auth.js';
import { hasDatabase } from '../../../lib/db.js';
import { isSlugAvailable } from '../../../lib/profiles.js';
import {
  normalizeEmail,
  normalizeSlug,
  validEmail,
  validateSlug,
} from '../../../lib/validation.js';
import { getClientIp, isRateLimited, sameOrigin } from '../../../lib/security.js';
import { createEmailVerificationToken } from '../../../lib/account-tokens.js';
import {
  isEmailDeliveryConfigured,
  sendVerificationEmail,
} from '../../../lib/email.js';

export const prerender = false;

function redirectWithError(message) {
  return `/registro?error=${encodeURIComponent(message)}`;
}

export async function POST({ request, cookies, redirect }) {
  if (!sameOrigin(request)) {
    return new Response('Solicitud no permitida', { status: 403 });
  }

  const ip = getClientIp(request);
  if (await isRateLimited(`register:${ip}`, { limit: 5, windowMs: 30 * 60_000 })) {
    return redirect(redirectWithError('Demasiados intentos. Espera unos minutos.'));
  }

  if (!hasDatabase()) {
    return redirect(redirectWithError('El registro estara disponible al conectar PostgreSQL.'));
  }

  const form = await request.formData();
  const email = normalizeEmail(form.get('email'));
  const password = String(form.get('password') || '');
  const displayName = String(form.get('displayName') || '').trim();
  const slug = normalizeSlug(form.get('slug'));
  const isAdult = form.get('isAdult') === 'yes';
  const acceptsTerms = form.get('acceptTerms') === 'yes';

  if (!isAdult || !acceptsTerms) {
    return redirect(redirectWithError('Debes ser mayor de 18 años y aceptar las condiciones.'));
  }

  if (!displayName || displayName.length > 60) {
    return redirect(redirectWithError('Escribe un nombre de hasta 60 caracteres.'));
  }
  if (!validEmail(email)) {
    return redirect(redirectWithError('Escribe un correo valido.'));
  }
  if (password.length < 8 || password.length > 72) {
    return redirect(redirectWithError('La contrasena debe tener entre 8 y 72 caracteres.'));
  }

  const slugError = validateSlug(slug);
  if (slugError) return redirect(redirectWithError(slugError));

  try {
    if (!(await isSlugAvailable(slug))) {
      return redirect(redirectWithError('Ese usuario ya esta en uso.'));
    }

    const emailConfigured = isEmailDeliveryConfigured();
    const account = await createAccount({
      email,
      password,
      slug,
      displayName,
      emailVerified: !emailConfigured,
    });

    if (emailConfigured) {
      const token = await createEmailVerificationToken(account.userId);
      try {
        await sendVerificationEmail({ email, displayName, token });
      } catch (emailError) {
        console.error('No se pudo enviar la verificacion inicial', emailError);
      }
    }

    const session = await createSession(account.userId);
    setSessionCookie(cookies, session);
    return redirect(emailConfigured ? '/app?welcome=1&verify=1' : '/app?welcome=1');
  } catch (error) {
    if (error?.code === '23505') {
      const field = error.constraint?.includes('email') ? 'correo' : 'usuario';
      return redirect(redirectWithError(`Ese ${field} ya esta en uso.`));
    }
    console.error('No se pudo crear la cuenta', error);
    return redirect(redirectWithError('No hemos podido crear la cuenta. Intentalo de nuevo.'));
  }
}
