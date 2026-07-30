import { hasDatabase, query } from '../../lib/db.js';

export const prerender = false;

export async function GET() {
  if (!hasDatabase()) {
    return Response.json({
      status: 'degraded',
      database: 'not-configured',
    });
  }

  try {
    await query('SELECT 1');
    return Response.json({ status: 'ok', database: 'connected' });
  } catch {
    return Response.json(
      { status: 'error', database: 'unavailable' },
      { status: 503 },
    );
  }
}
