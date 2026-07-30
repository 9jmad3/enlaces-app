import {
  clearSessionCookie,
  deleteSession,
  SESSION_COOKIE,
} from '../../../lib/auth.js';
import { sameOrigin } from '../../../lib/security.js';

export const prerender = false;

export async function POST({ request, cookies, redirect }) {
  if (!sameOrigin(request)) {
    return new Response('Solicitud no permitida', { status: 403 });
  }

  const token = cookies.get(SESSION_COOKIE)?.value;
  try {
    await deleteSession(token);
  } catch {
    // La cookie se elimina incluso si la base de datos no esta disponible.
  }
  clearSessionCookie(cookies);
  return redirect('/');
}
