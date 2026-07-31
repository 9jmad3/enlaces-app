import { hasDatabase } from '../../../lib/db.js';
import {
  createProfileReport,
  isReportReason,
} from '../../../lib/moderation.js';
import { getPublicProfile } from '../../../lib/profiles.js';
import {
  getClientIp,
  isRateLimited,
  sameOrigin,
} from '../../../lib/security.js';
import { normalizeEmail, normalizeSlug, validEmail } from '../../../lib/validation.js';

export const prerender = false;

function redirect(slug, parameter) {
  return new Response(null, {
    status: 303,
    headers: { Location: `/${encodeURIComponent(slug)}?${parameter}=1` },
  });
}

export async function POST({ request }) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (!sameOrigin(request) || contentLength > 16_384) {
    return new Response('Solicitud no válida', { status: 400 });
  }

  const form = await request.formData();
  const slug = normalizeSlug(form.get('slug'));
  if (!slug) return new Response('Perfil no válido', { status: 400 });

  // Honeypot: automated submissions usually complete this invisible field.
  if (String(form.get('website') || '').trim()) return redirect(slug, 'reported');

  const ip = getClientIp(request);
  const limited = await Promise.all([
    isRateLimited(`report:${slug}:${ip}`, { limit: 3, windowMs: 24 * 60 * 60_000 }),
    isRateLimited(`report:all:${ip}`, { limit: 8, windowMs: 24 * 60 * 60_000 }),
  ]);
  if (limited.some(Boolean)) return redirect(slug, 'reportLimited');
  if (!hasDatabase()) return redirect(slug, 'reportError');

  const reason = String(form.get('reason') || '');
  const details = String(form.get('details') || '').trim().slice(0, 1000);
  const reporterEmail = normalizeEmail(form.get('email'));
  if (
    !isReportReason(reason)
    || (reason === 'other' && details.length < 10)
    || (reporterEmail && !validEmail(reporterEmail))
  ) {
    return redirect(slug, 'reportError');
  }

  const profile = await getPublicProfile(slug);
  if (!profile || String(profile.id).startsWith('fallback-')) {
    return redirect(slug, 'reportError');
  }

  await createProfileReport({
    profileId: profile.id,
    reporterEmail,
    reason,
    details,
  });

  return redirect(slug, 'reported');
}
