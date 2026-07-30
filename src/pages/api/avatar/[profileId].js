import { query } from '../../../lib/db.js';

export const prerender = false;

export async function GET({ params, locals, request }) {
  const profileId = String(params.profileId || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profileId)) {
    return new Response('Imagen no encontrada', { status: 404 });
  }

  const result = await query(
    `SELECT a.content_type, a.content, a.etag
     FROM profile_avatars a
     JOIN profiles p ON p.id = a.profile_id
     WHERE a.profile_id = $1
       AND (p.published = TRUE OR p.user_id = $2::uuid)`,
    [profileId, locals.user?.id || null],
  );
  const avatar = result.rows[0];
  if (!avatar) return new Response('Imagen no encontrada', { status: 404 });

  const etag = `"${avatar.etag.trim()}"`;
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(avatar.content, {
    headers: {
      'Content-Type': avatar.content_type,
      'Content-Length': String(avatar.content.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: etag,
    },
  });
}
