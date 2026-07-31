import { isAdmin, moderateReport } from '../../../lib/moderation.js';
import {
  getClientIp,
  isRateLimited,
  sameOrigin,
} from '../../../lib/security.js';

export const prerender = false;

const VALID_ACTIONS = new Set(['review', 'dismiss', 'suspend', 'restore']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function redirect(parameter) {
  return new Response(null, {
    status: 303,
    headers: { Location: `/admin?${parameter}=1` },
  });
}

export async function POST({ request, locals }) {
  if (!sameOrigin(request)) return new Response('Solicitud no válida', { status: 400 });
  if (!locals.user) return new Response('No autenticado', { status: 401 });
  if (!isAdmin(locals.user)) return new Response('No encontrado', { status: 404 });

  const limited = await isRateLimited(
    `admin-moderation:${locals.user.id}:${getClientIp(request)}`,
    { limit: 60, windowMs: 60 * 60_000 },
  );
  if (limited) return redirect('limited');

  const form = await request.formData();
  const reportId = String(form.get('reportId') || '');
  const action = String(form.get('action') || '');
  const note = String(form.get('note') || '').trim().slice(0, 1000);
  if (!UUID_PATTERN.test(reportId) || !VALID_ACTIONS.has(action)) {
    return redirect('error');
  }

  const report = await moderateReport({
    reportId,
    action,
    note,
    adminUserId: locals.user.id,
  });

  return redirect(report ? 'updated' : 'error');
}
