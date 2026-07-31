import { query } from './db.js';

const USERS_PER_PAGE = 25;

export function normalizeAdminDirectoryParams(search, page) {
  const normalizedSearch = String(search || '').trim().slice(0, 80);
  const parsedPage = Number.parseInt(String(page || '1'), 10);

  return {
    search: normalizedSearch,
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    pageSize: USERS_PER_PAGE,
  };
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

export async function getAdminOverview({ search = '', page = 1 } = {}) {
  const params = normalizeAdminDirectoryParams(search, page);
  const pattern = `%${escapeLike(params.search)}%`;
  const offset = (params.page - 1) * params.pageSize;

  const [metricsResult, registrationsResult, templatesResult, usersResult, userCountResult] = await Promise.all([
    query(
      `SELECT
         (SELECT COUNT(*)::int FROM users) AS users_total,
         (SELECT COUNT(*)::int FROM users WHERE email_verified_at IS NOT NULL) AS users_verified,
         (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '7 days') AS users_last_7_days,
         (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '30 days') AS users_last_30_days,
         (SELECT COUNT(*)::int FROM profiles) AS profiles_total,
         (SELECT COUNT(*)::int FROM profiles WHERE published = TRUE AND suspended_at IS NULL) AS profiles_published,
         (SELECT COUNT(*)::int FROM profiles WHERE suspended_at IS NOT NULL) AS profiles_suspended,
         (SELECT COUNT(*)::int FROM profile_links WHERE enabled = TRUE) AS links_active`,
    ),
    query(
      `SELECT
         days.day::date AS day,
         COUNT(u.id)::int AS registrations
       FROM generate_series(
         CURRENT_DATE - INTERVAL '13 days',
         CURRENT_DATE,
         INTERVAL '1 day'
       ) AS days(day)
       LEFT JOIN users u
         ON u.created_at >= days.day
        AND u.created_at < days.day + INTERVAL '1 day'
       GROUP BY days.day
       ORDER BY days.day`,
    ),
    query(
      `SELECT template_id, COUNT(*)::int AS profiles
       FROM profiles
       GROUP BY template_id
       ORDER BY profiles DESC, template_id`,
    ),
    query(
      `SELECT
         u.id,
         u.email,
         u.email_verified_at,
         u.pending_email,
         u.created_at,
         p.slug,
         p.display_name,
         p.template_id,
         p.published,
         p.suspended_at,
         p.updated_at,
         COUNT(DISTINCT l.id)::int AS links,
         COUNT(DISTINCT r.id)::int AS reports
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN profile_links l ON l.profile_id = p.id
       LEFT JOIN profile_reports r ON r.profile_id = p.id
       WHERE (
         $1 = ''
         OR u.email ILIKE $2 ESCAPE '\\'
         OR p.slug ILIKE $2 ESCAPE '\\'
         OR p.display_name ILIKE $2 ESCAPE '\\'
       )
       GROUP BY u.id, p.id
       ORDER BY u.created_at DESC
       LIMIT $3 OFFSET $4`,
      [params.search, pattern, params.pageSize, offset],
    ),
    query(
      `SELECT COUNT(*)::int AS total
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE (
         $1 = ''
         OR u.email ILIKE $2 ESCAPE '\\'
         OR p.slug ILIKE $2 ESCAPE '\\'
         OR p.display_name ILIKE $2 ESCAPE '\\'
       )`,
      [params.search, pattern],
    ),
  ]);

  const totalUsers = userCountResult.rows[0]?.total || 0;

  return {
    metrics: metricsResult.rows[0],
    registrations: registrationsResult.rows,
    templates: templatesResult.rows,
    users: usersResult.rows,
    directory: {
      ...params,
      totalUsers,
      totalPages: Math.max(1, Math.ceil(totalUsers / params.pageSize)),
    },
  };
}
