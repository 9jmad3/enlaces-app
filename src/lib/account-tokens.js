import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query, transaction } from './db.js';

const VERIFY_HOURS = 24;
const EMAIL_CHANGE_HOURS = 2;
const RESET_MINUTES = 30;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function createRawToken() {
  return randomBytes(32).toString('hex');
}

async function insertToken(client, userId, purpose, token, expiresAt) {
  await client.query(
    `DELETE FROM account_tokens
     WHERE expires_at < NOW() - INTERVAL '1 day'`,
  );
  await client.query(
    `DELETE FROM account_tokens
     WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
    [userId, purpose],
  );
  await client.query(
    `INSERT INTO account_tokens (id, user_id, purpose, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [randomUUID(), userId, purpose, hashToken(token), expiresAt],
  );
}

export async function createEmailVerificationToken(userId) {
  const token = createRawToken();
  const expiresAt = new Date(Date.now() + VERIFY_HOURS * 60 * 60_000);
  await transaction((client) => insertToken(
    client,
    userId,
    'verify_email',
    token,
    expiresAt,
  ));
  return token;
}

export async function beginEmailChange(userId, email) {
  const token = createRawToken();
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_HOURS * 60 * 60_000);

  await transaction(async (client) => {
    const existing = await client.query(
      `SELECT 1 FROM users
       WHERE (email = $1 OR pending_email = $1) AND id <> $2`,
      [email, userId],
    );
    if (existing.rowCount) {
      const error = new Error('Ese correo ya esta en uso');
      error.code = 'EMAIL_TAKEN';
      throw error;
    }

    await client.query(
      'UPDATE users SET pending_email = $1, updated_at = NOW() WHERE id = $2',
      [email, userId],
    );
    await insertToken(client, userId, 'verify_email_change', token, expiresAt);
  });

  return token;
}

export async function createPasswordResetToken(email) {
  const result = await query(
    `SELECT u.id, u.email, p.display_name
     FROM users u
     JOIN profiles p ON p.user_id = u.id
     WHERE u.email = $1`,
    [email],
  );
  const user = result.rows[0];
  if (!user) return null;

  const token = createRawToken();
  const expiresAt = new Date(Date.now() + RESET_MINUTES * 60_000);
  await transaction((client) => insertToken(
    client,
    user.id,
    'reset_password',
    token,
    expiresAt,
  ));
  return { token, user };
}

export async function getTokenStatus(token, purposes) {
  if (!token || token.length !== 64) return null;
  const result = await query(
    `SELECT purpose, expires_at
     FROM account_tokens
     WHERE token_hash = $1
       AND purpose = ANY($2::varchar[])
       AND used_at IS NULL
       AND expires_at > NOW()`,
    [hashToken(token), purposes],
  );
  return result.rows[0] || null;
}

export async function consumeEmailVerificationToken(token) {
  return transaction(async (client) => {
    const result = await client.query(
      `SELECT t.id, t.user_id, t.purpose, u.pending_email
       FROM account_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = $1
         AND t.purpose IN ('verify_email', 'verify_email_change')
         AND t.used_at IS NULL
         AND t.expires_at > NOW()
       FOR UPDATE`,
      [hashToken(token)],
    );
    const record = result.rows[0];
    if (!record) return null;

    if (record.purpose === 'verify_email_change') {
      if (!record.pending_email) return null;
      await client.query(
        `UPDATE users
         SET email = pending_email,
             pending_email = NULL,
             email_verified_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [record.user_id],
      );
    } else {
      await client.query(
        'UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1',
        [record.user_id],
      );
    }

    await client.query(
      'UPDATE account_tokens SET used_at = NOW() WHERE id = $1',
      [record.id],
    );
    return { userId: record.user_id, purpose: record.purpose };
  });
}

export async function resetPasswordWithToken(token, password) {
  const passwordHash = await bcrypt.hash(password, 12);
  const sessionToken = createRawToken();
  const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60_000);

  return transaction(async (client) => {
    const result = await client.query(
      `SELECT id, user_id
       FROM account_tokens
       WHERE token_hash = $1
         AND purpose = 'reset_password'
         AND used_at IS NULL
         AND expires_at > NOW()
       FOR UPDATE`,
      [hashToken(token)],
    );
    const record = result.rows[0];
    if (!record) return null;

    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, record.user_id],
    );
    await client.query('DELETE FROM sessions WHERE user_id = $1', [record.user_id]);
    await client.query(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [
        randomUUID(),
        record.user_id,
        hashToken(sessionToken),
        sessionExpiresAt,
      ],
    );
    await client.query(
      'UPDATE account_tokens SET used_at = NOW() WHERE id = $1',
      [record.id],
    );

    return {
      session: { token: sessionToken, expiresAt: sessionExpiresAt },
      userId: record.user_id,
    };
  });
}
