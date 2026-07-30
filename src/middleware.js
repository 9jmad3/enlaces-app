import { defineMiddleware } from 'astro:middleware';
import { getSessionUser, SESSION_COOKIE } from './lib/auth.js';

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.user = null;
  const token = context.cookies.get(SESSION_COOKIE)?.value;

  if (token) {
    try {
      context.locals.user = await getSessionUser(token);
    } catch {
      context.locals.user = null;
    }
  }

  if (context.url.pathname.startsWith('/app') && !context.locals.user) {
    return context.redirect('/login?next=/app');
  }

  const response = await next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
});
