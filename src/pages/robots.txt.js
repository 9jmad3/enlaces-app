export const prerender = false;

export function GET({ site, url }) {
  const origin = new URL(site || url.origin);
  const sitemap = new URL('/sitemap.xml', origin);

  return new Response(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /api/',
      'Disallow: /app',
      'Disallow: /login',
      'Disallow: /registro',
      'Disallow: /recuperar-contrasena',
      'Disallow: /restablecer-contrasena',
      'Disallow: /verificar-correo',
      '',
      `Sitemap: ${sitemap.href}`,
      '',
    ].join('\n'),
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    },
  );
}
