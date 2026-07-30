import { createHmac } from 'node:crypto';
import { hasDatabase, query } from './db.js';

const fallbackAttempts = new Map();
const rateLimitSecret = process.env.RATE_LIMIT_SECRET
  || 'trazli-development-rate-limit-secret';

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

function memoryRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const current = fallbackAttempts.get(key);

  if (!current || current.resetAt <= now) {
    fallbackAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  current.count += 1;
  return current.count > limit;
}

function hashRateLimitKey(key) {
  return createHmac('sha256', rateLimitSecret).update(key).digest('hex');
}

export async function isRateLimited(
  key,
  { limit = 10, windowMs = 15 * 60_000 } = {},
) {
  if (!hasDatabase()) return memoryRateLimit(key, limit, windowMs);

  const keyHash = hashRateLimitKey(key);
  const expiresAt = new Date(Date.now() + windowMs);

  try {
    const result = await query(
      `INSERT INTO rate_limits (key_hash, attempts, expires_at)
       VALUES ($1, 1, $2)
       ON CONFLICT (key_hash) DO UPDATE SET
         attempts = CASE
           WHEN rate_limits.expires_at <= NOW() THEN 1
           ELSE rate_limits.attempts + 1
         END,
         expires_at = CASE
           WHEN rate_limits.expires_at <= NOW() THEN EXCLUDED.expires_at
           ELSE rate_limits.expires_at
         END,
         updated_at = NOW()
       RETURNING attempts`,
      [keyHash, expiresAt],
    );

    // Keep the security table bounded without adding a separate scheduler.
    if (Math.random() < 0.02) {
      await query(
        `DELETE FROM rate_limits
         WHERE key_hash IN (
           SELECT key_hash
           FROM rate_limits
           WHERE expires_at < NOW() - INTERVAL '1 day'
           LIMIT 100
         )`,
      );
    }

    return result.rows[0].attempts > limit;
  } catch (error) {
    console.error('No se pudo consultar el limite persistente', error);
    return memoryRateLimit(keyHash, limit, windowMs);
  }
}
