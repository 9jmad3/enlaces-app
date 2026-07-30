import pg from 'pg';

const connectionString = import.meta.env.DATABASE_URL;

const pool = connectionString
  ? new pg.Pool({
      connectionString,
      ssl: import.meta.env.DATABASE_SSL === 'false'
        ? false
        : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
    })
  : null;

export function hasDatabase() {
  return Boolean(pool);
}

export function query(text, values = []) {
  if (!pool) {
    throw new Error('DATABASE_URL no esta configurada');
  }

  return pool.query(text, values);
}

export async function transaction(callback) {
  if (!pool) {
    throw new Error('DATABASE_URL no esta configurada');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
