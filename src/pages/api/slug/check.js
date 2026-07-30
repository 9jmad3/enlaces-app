import { hasDatabase } from '../../../lib/db.js';
import { isSlugAvailable } from '../../../lib/profiles.js';
import { normalizeSlug, validateSlug } from '../../../lib/validation.js';
import { getClientIp, isRateLimited } from '../../../lib/security.js';

export const prerender = false;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET({ request, locals }) {
  const ip = getClientIp(request);
  if (await isRateLimited(`slug-check:${ip}`, { limit: 60, windowMs: 60_000 })) {
    return json({ available: false, message: 'Espera un momento para seguir comprobando.' }, 429);
  }

  const slug = normalizeSlug(new URL(request.url).searchParams.get('slug'));
  const validationError = validateSlug(slug);
  if (validationError) {
    return json({ available: false, normalized: slug, message: validationError });
  }

  if (!hasDatabase()) {
    return json({ available: false, message: 'No se puede comprobar ahora mismo.' }, 503);
  }

  try {
    const available = await isSlugAvailable(slug, locals.user?.id || '');
    return json({
      available,
      normalized: slug,
      message: available ? 'Disponible' : 'Ya esta ocupado',
    });
  } catch {
    return json({ available: false, message: 'No se puede comprobar ahora mismo.' }, 503);
  }
}
