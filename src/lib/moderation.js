import { randomUUID } from 'node:crypto';
import { query, transaction } from './db.js';

export const REPORT_REASONS = Object.freeze({
  impersonation: 'Suplantación de identidad',
  fraud: 'Fraude o estafa',
  illegal: 'Contenido ilegal',
  harassment: 'Acoso o amenazas',
  spam: 'Spam o contenido engañoso',
  other: 'Otro motivo',
});

export const REPORT_RULES = Object.freeze({
  impersonation: 'Condiciones de uso: prohibición de suplantar a otra persona o infringir derechos de terceros.',
  fraud: 'Condiciones de uso: prohibición de contenido fraudulento o engañoso.',
  illegal: 'Condiciones de uso: prohibición de contenido o actividades ilegales.',
  harassment: 'Condiciones de uso: prohibición de contenido violento, discriminatorio, de acoso o amenazas.',
  spam: 'Condiciones de uso: prohibición de spam, malware y prácticas engañosas.',
  other: 'Condiciones de uso: contenidos permitidos y normas de moderación y suspensión.',
});

const adminEmails = new Set(
  String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export function isAdmin(user) {
  return Boolean(user?.email && adminEmails.has(user.email.toLowerCase()));
}

export function isReportReason(reason) {
  return Object.hasOwn(REPORT_REASONS, reason);
}

export async function createProfileReport({
  profileId,
  reporterEmail,
  reason,
  details,
}) {
  const reportId = randomUUID();
  await query(
    `INSERT INTO profile_reports
      (id, profile_id, reporter_email, reason, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      reportId,
      profileId,
      reporterEmail || null,
      reason,
      details,
    ],
  );
  return reportId;
}

export async function markReportReceiptSent(reportId) {
  await query(
    'UPDATE profile_reports SET receipt_sent_at = NOW() WHERE id = $1',
    [reportId],
  );
}

export async function getModerationDashboard() {
  const [reports, counts] = await Promise.all([
    query(
      `SELECT
         r.id,
         r.reason,
         r.details,
         r.reporter_email,
         r.status,
         r.admin_note,
         r.public_reason,
         r.receipt_sent_at,
         r.created_at,
         r.reviewed_at,
         p.id AS profile_id,
         p.slug,
         p.display_name,
         p.suspended_at,
         p.suspension_reason,
         u.email AS owner_email,
         latest_action.action AS latest_action,
         latest_action.reporter_notified_at,
         latest_action.owner_notified_at,
         latest_action.reporter_notification_error,
         latest_action.owner_notification_error
       FROM profile_reports r
       JOIN profiles p ON p.id = r.profile_id
       JOIN users u ON u.id = p.user_id
       LEFT JOIN LATERAL (
         SELECT
           action,
           reporter_notified_at,
           owner_notified_at,
           reporter_notification_error,
           owner_notification_error
         FROM profile_moderation_actions
         WHERE report_id = r.id
         ORDER BY created_at DESC
         LIMIT 1
       ) latest_action ON TRUE
       ORDER BY
         CASE r.status WHEN 'pending' THEN 0 WHEN 'reviewed' THEN 1 ELSE 2 END,
         r.created_at DESC
       LIMIT 150`,
    ),
    query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'actioned')::int AS actioned,
         COUNT(*)::int AS total,
         (SELECT COUNT(*)::int FROM profiles WHERE suspended_at IS NOT NULL) AS suspended
       FROM profile_reports`,
    ),
  ]);

  return {
    reports: reports.rows,
    counts: counts.rows[0],
  };
}

export async function moderateReport({
  reportId,
  action,
  note,
  publicReason,
  adminUserId,
}) {
  return transaction(async (client) => {
    const result = await client.query(
      `SELECT
         r.id,
         r.profile_id,
         r.reason,
         r.reporter_email,
         p.slug,
         p.display_name,
         u.email AS owner_email
       FROM profile_reports r
       JOIN profiles p ON p.id = r.profile_id
       JOIN users u ON u.id = p.user_id
       WHERE r.id = $1
       FOR UPDATE`,
      [reportId],
    );
    const report = result.rows[0];
    if (!report) return null;

    if (action === 'suspend') {
      await client.query(
        `UPDATE profiles
         SET suspended_at = NOW(),
             suspension_reason = $1,
             published = FALSE,
             updated_at = NOW()
         WHERE id = $2`,
        [publicReason, report.profile_id],
      );
    } else if (action === 'restore') {
      await client.query(
        `UPDATE profiles
         SET suspended_at = NULL,
             suspension_reason = NULL,
             published = TRUE,
             updated_at = NOW()
         WHERE id = $1`,
        [report.profile_id],
      );
    }

    const status = action === 'dismiss'
      ? 'dismissed'
      : action === 'review'
        ? 'reviewed'
        : 'actioned';

    await client.query(
      `UPDATE profile_reports
       SET status = $1,
           admin_note = $2,
           public_reason = $3,
           reviewed_by = $4,
           reviewed_at = NOW()
       WHERE id = $5`,
      [status, note, publicReason, adminUserId, reportId],
    );

    const actionId = randomUUID();
    await client.query(
      `INSERT INTO profile_moderation_actions
        (id, report_id, profile_id, admin_user_id, action, note, public_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        actionId,
        reportId,
        report.profile_id,
        adminUserId,
        action,
        note,
        publicReason,
      ],
    );

    return {
      ...report,
      action_id: actionId,
      public_reason: publicReason,
    };
  });
}

export async function markModerationNotificationSent(actionId, recipient) {
  const fields = recipient === 'reporter'
    ? ['reporter_notified_at', 'reporter_notification_error']
    : recipient === 'owner'
      ? ['owner_notified_at', 'owner_notification_error']
      : null;
  if (!fields) throw new Error('Destinatario de moderación no válido');

  await query(
    `UPDATE profile_moderation_actions
     SET ${fields[0]} = NOW(), ${fields[1]} = NULL
     WHERE id = $1`,
    [actionId],
  );
}

export async function recordModerationNotificationError(actionId, recipient, error) {
  const column = recipient === 'reporter'
    ? 'reporter_notification_error'
    : recipient === 'owner'
      ? 'owner_notification_error'
      : '';
  if (!column) throw new Error('Destinatario de moderación no válido');

  await query(
    `UPDATE profile_moderation_actions
     SET ${column} = $1
     WHERE id = $2`,
    [String(error?.message || error).slice(0, 1000), actionId],
  );
}
