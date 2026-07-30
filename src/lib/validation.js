export const RESERVED_SLUGS = new Set([
  // Application routes and authentication.
  'app',
  'api',
  'auth',
  'oauth',
  'dashboard',
  'panel',
  'login',
  'logout',
  'signin',
  'signup',
  'register',
  'registro',
  'salir',
  'account',
  'cuenta',
  'settings',
  'ajustes',
  'config',
  'configuracion',
  'forgot-password',
  'recuperar-contrasena',
  'reset-password',
  'restablecer-contrasena',
  'verify-email',
  'verificar-correo',

  // Legal and public service pages.
  'legal',
  'aviso-legal',
  'privacy',
  'privacidad',
  'terms',
  'condiciones',
  'cookies',
  'contact',
  'contacto',
  'help',
  'ayuda',
  'support',
  'soporte',
  'faq',
  'status',
  'health',
  'report',
  'reports',
  'denunciar',

  // Protected identities and privileged roles.
  'nexo',
  'nexoapp',
  'nexo-oficial',
  'trazli',
  'trazliapp',
  'trazli-oficial',
  'admin',
  'administrator',
  'administrador',
  'administracion',
  'moderator',
  'moderador',
  'staff',
  'official',
  'oficial',
  'root',
  'system',
  'security',
  'seguridad',

  // Infrastructure and static resources.
  'assets',
  'static',
  'public',
  'uploads',
  'media',
  'images',
  'img',
  'favicon',
  'robots',
  'sitemap',

  // Profiles reserved for examples and service operations.
  'example',
  'ejemplo',
  'demo',
  'profile',
  'perfil',
  'user',
  'usuario',
  'users',
  'usuarios',
  'paypal',
  'payment',
  'pagos',
  'billing',
  'premium',
  'donate',
  'donacion',
  'donaciones',
]);

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '');
}

export function validateSlug(slug) {
  if (slug.length < 3 || slug.length > 30) {
    return 'El usuario debe tener entre 3 y 30 caracteres.';
  }

  if (!/^[a-z0-9][a-z0-9_-]*$/.test(slug)) {
    return 'Usa letras, numeros, guiones o guiones bajos.';
  }

  if (RESERVED_SLUGS.has(slug)) {
    return 'Ese nombre está reservado por Trazli.';
  }

  return '';
}

export function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function safeUrl(value, { allowRelative = false } = {}) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (allowRelative && raw.startsWith('/')) return raw;

  try {
    // People usually paste domains without a protocol in link-in-bio editors.
    const candidate = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

export function validHex(value, fallback) {
  const color = String(value || '').toUpperCase();
  return /^#[0-9A-F]{6}$/.test(color) ? color : fallback;
}
