import { getPublishedProfiles } from '../lib/profiles.js';

export const prerender = false;

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function entry(location, lastModified = null) {
  const lastmod = lastModified
    ? `<lastmod>${new Date(lastModified).toISOString()}</lastmod>`
    : '';

  return `<url><loc>${escapeXml(location)}</loc>${lastmod}</url>`;
}

export async function GET({ site, url }) {
  const origin = new URL(site || url.origin);
  const profiles = await getPublishedProfiles();
  const urls = [
    entry(new URL('/', origin).href),
    ...profiles.map((profile) => (
      entry(new URL(`/${encodeURIComponent(profile.slug)}`, origin).href, profile.updated_at)
    )),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
    },
  });
}
