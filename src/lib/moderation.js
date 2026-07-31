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
  await query(
    `INSERT INTO profile_reports
      (id, profile_id, reporter_email, reason, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      randomUUID(),
      profileId,
      reporterEmail || null,
      reason,
      details,
    ],
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
         r.created_at,
         r.reviewed_at,
         p.id AS profile_id,
         p.slug,
         p.display_name,
         p.suspended_at,
         p.suspension_reason,
         u.email AS owner_email
       FROM profile_reports r
       JOIN profiles p ON p.id = r.profile_id
       JOIN users u ON u.id = p.user_id
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
  adminUserId,
}) {
  return transaction(async (client) => {
    const result = await client.query(
      `SELECT r.id, r.profile_id, r.reason, p.slug
       FROM profile_reports r
       JOIN profiles p ON p.id = r.profile_id
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
        [REPORT_REASONS[report.reason], report.profile_id],
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
           reviewed_by = $3,
           reviewed_at = NOW()
       WHERE id = $4`,
      [status, note, adminUserId, reportId],
    );

    await client.query(
      `INSERT INTO profile_moderation_actions
        (id, report_id, profile_id, admin_user_id, action, note)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        randomUUID(),
        reportId,
        report.profile_id,
        adminUserId,
        action,
        note,
      ],
    );

    return report;
  });
}
