import {
  getPublicProfile,
  getPublicProfileAvatar,
} from '../../../lib/profiles.js';
import { renderProfileOgImage } from '../../../lib/og-image.js';

export const prerender = false;

export async function GET({ params }) {
  const slug = String(params.slug || '').toLowerCase();
  const profile = await getPublicProfile(slug);
  if (!profile) return new Response('Imagen no encontrada', { status: 404 });

  const avatar = await getPublicProfileAvatar(profile.id);
  const image = await renderProfileOgImage(profile, avatar);

  return new Response(image, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(image.length),
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
