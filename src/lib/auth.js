import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query, transaction } from './db.js';

export const SESSION_COOKIE = 'enlaces_session';
export const TERMS_VERSION = '2026-07-30';
const SESSION_DAYS = 30;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createAccount({ email, password, slug, displayName }) {
  const userId = randomUUID();
  const profileId = randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);

  await transaction(async (client) => {
    await client.query(
      `INSERT INTO users
        (id, email, password_hash, terms_accepted_at, terms_version)
       VALUES ($1, $2, $3, NOW(), $4)`,
      [userId, email, passwordHash, TERMS_VERSION],
    );
    await client.query(
      `INSERT INTO profiles
        (id, user_id, slug, display_name, tagline, bio)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        profileId,
        userId,
        slug,
        displayName,
        'Mi espacio, mis enlaces.',
        'Encuentra aqui todo lo que comparto.',
      ],
    );
  });

  return { userId, profileId };
}

export async function authenticate(email, password) {
  const result = await query(
    'SELECT id, email, password_hash FROM users WHERE email = $1',
    [email],
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return null;
  }
  return { id: user.id, email: user.email };
}

export async function verifyUserPassword(userId, password) {
  const result = await query(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId],
  );
  const user = result.rows[0];
  return Boolean(user && await bcrypt.compare(password, user.password_hash));
}

export async function updateUserEmail(userId, email) {
  await query(
    'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2',
    [email, userId],
  );
}

export async function updateUserPassword(userId, password) {
  const passwordHash = await bcrypt.hash(password, 12);
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await transaction(async (client) => {
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, userId],
    );
    await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    await client.query(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [randomUUID(), userId, hashToken(token), expiresAt],
    );
  });

  return { token, expiresAt };
}

export async function deleteUserAccount(userId) {
  await query('DELETE FROM users WHERE id = $1', [userId]);
}

export async function createSession(userId) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await query('DELETE FROM sessions WHERE expires_at <= NOW()');
  await query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), userId, hashToken(token), expiresAt],
  );

  return { token, expiresAt };
}

export async function getSessionUser(token) {
  if (!token) return null;

  const result = await query(
    `SELECT
       u.id,
       u.email,
       p.id AS profile_id,
       p.slug,
       p.display_name
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     JOIN profiles p ON p.user_id = u.id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [hashToken(token)],
  );

  return result.rows[0] || null;
}

export async function deleteSession(token) {
  if (!token) return;
  await query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
}

export function setSessionCookie(cookies, session) {
  cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    path: '/',
    expires: session.expiresAt,
  });
}

export function clearSessionCookie(cookies) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}
