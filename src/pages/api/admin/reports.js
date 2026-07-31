import {
  sendOwnerModerationEmail,
  sendReporterDecisionEmail,
} from '../../../lib/email.js';
import {
  isAdmin,
  markModerationNotificationSent,
  moderateReport,
  recordModerationNotificationError,
  REPORT_REASONS,
  REPORT_RULES,
} from '../../../lib/moderation.js';
import {
  getClientIp,
  isRateLimited,
  sameOrigin,
} from '../../../lib/security.js';

export const prerender = false;

const VALID_ACTIONS = new Set(['review', 'dismiss', 'suspend', 'restore']);
const FINAL_ACTIONS = new Set(['dismiss', 'suspend', 'restore']);
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
  const publicReason = String(form.get('publicReason') || '').trim().slice(0, 1000);
  if (!UUID_PATTERN.test(reportId) || !VALID_ACTIONS.has(action)) {
    return redirect('error');
  }
  if (FINAL_ACTIONS.has(action) && publicReason.length < 10) {
    return redirect('explanationRequired');
  }

  const report = await moderateReport({
    reportId,
    action,
    note,
    publicReason,
    adminUserId: locals.user.id,
  });

  if (!report) return redirect('error');
  if (!FINAL_ACTIONS.has(action)) return redirect('updated');

  let notificationFailed = false;
  const reasonLabel = REPORT_REASONS[report.reason];
  const ruleLabel = REPORT_RULES[report.reason];

  if (report.reporter_email) {
    try {
      const sent = await sendReporterDecisionEmail({
        email: report.reporter_email,
        actionId: report.action_id,
        reportId: report.id,
        profileSlug: report.slug,
        action,
        reasonLabel,
        publicReason,
        ruleLabel,
      });
      if (!sent) throw new Error('El correo transaccional no está configurado');
      await markModerationNotificationSent(report.action_id, 'reporter');
    } catch (error) {
      notificationFailed = true;
      console.error('No se pudo notificar al denunciante', error);
      await recordModerationNotificationError(report.action_id, 'reporter', error);
    }
  }

  if (action === 'suspend' || action === 'restore') {
    try {
      const sent = await sendOwnerModerationEmail({
        email: report.owner_email,
        displayName: report.display_name,
        actionId: report.action_id,
        profileSlug: report.slug,
        action,
        reasonLabel,
        publicReason,
        ruleLabel,
      });
      if (!sent) throw new Error('El correo transaccional no está configurado');
      await markModerationNotificationSent(report.action_id, 'owner');
    } catch (error) {
      notificationFailed = true;
      console.error('No se pudo notificar al propietario', error);
      await recordModerationNotificationError(report.action_id, 'owner', error);
    }
  }

  return redirect(notificationFailed ? 'notificationError' : 'updated');
}
