const attempts = new Map();

export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;
    const forwardedHost = request.headers
      .get('x-forwarded-host')
      ?.split(',')[0]
      ?.trim();
    const requestHost =
      forwardedHost || request.headers.get('host') || new URL(request.url).host;
    const siteHost = process.env.SITE_URL
      ? new URL(process.env.SITE_URL).host
      : '';

    return originHost === requestHost || Boolean(siteHost && originHost === siteHost);
  } catch {
    return false;
  }
}

export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export function isRateLimited(key, { limit = 10, windowMs = 15 * 60_000 } = {}) {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  current.count += 1;
  return current.count > limit;
}
