const RESERVED_SLUGS = new Set([
  'app',
  'api',
  'login',
  'registro',
  'salir',
  'privacidad',
  'condiciones',
  'admin',
  'assets',
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
    return 'Ese usuario esta reservado.';
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
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

export function validHex(value, fallback) {
  const color = String(value || '').toUpperCase();
  return /^#[0-9A-F]{6}$/.test(color) ? color : fallback;
}
