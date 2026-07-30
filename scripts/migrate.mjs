import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.log('DATABASE_URL no configurada: se omiten las migraciones.');
  process.exit(0);
}

const ssl = process.env.DATABASE_SSL === 'false'
  ? false
  : { rejectUnauthorized: false };

const client = new pg.Client({ connectionString, ssl });

try {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationsPath = path.resolve('database');
  const filenames = (await fs.readdir(migrationsPath))
    .filter((filename) => filename.endsWith('.sql'))
    .sort();

  for (const filename of filenames) {
    const result = await client.query(
      'SELECT 1 FROM schema_migrations WHERE filename = $1',
      [filename],
    );

    if (result.rowCount) continue;

    const sql = await fs.readFile(path.join(migrationsPath, filename), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [filename],
      );
      await client.query('COMMIT');
      console.log(`Migracion aplicada: ${filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
} finally {
  await client.end();
}
