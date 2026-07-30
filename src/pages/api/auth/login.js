import {
  authenticate,
  createSession,
  setSessionCookie,
} from '../../../lib/auth.js';
import { hasDatabase } from '../../../lib/db.js';
import { normalizeEmail } from '../../../lib/validation.js';
import { getClientIp, isRateLimited, sameOrigin } from '../../../lib/security.js';

export const prerender = false;

function loginError(message) {
  return `/login?error=${encodeURIComponent(message)}`;
}

export async function POST({ request, cookies, redirect }) {
  if (!sameOrigin(request)) {
    return new Response('Solicitud no permitida', { status: 403 });
  }

  const ip = getClientIp(request);
  if (await isRateLimited(`login:${ip}`, { limit: 10, windowMs: 15 * 60_000 })) {
    return redirect(loginError('Demasiados intentos. Espera unos minutos.'));
  }

  if (!hasDatabase()) {
    return redirect(loginError('El acceso estara disponible al conectar PostgreSQL.'));
  }

  const form = await request.formData();
  const email = normalizeEmail(form.get('email'));
  const password = String(form.get('password') || '');

  try {
    const user = await authenticate(email, password);
    if (!user) {
      return redirect(loginError('Correo o contrasena incorrectos.'));
    }

    const session = await createSession(user.id);
    setSessionCookie(cookies, session);
    return redirect('/app');
  } catch (error) {
    console.error('No se pudo iniciar sesion', error);
    return redirect(loginError('No hemos podido iniciar sesion. Intentalo de nuevo.'));
  }
}
