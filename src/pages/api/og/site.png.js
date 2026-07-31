import { renderSiteOgImage } from '../../../lib/og-image.js';

export const prerender = false;

export async function GET() {
  const image = await renderSiteOgImage();

  return new Response(image, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(image.length),
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
