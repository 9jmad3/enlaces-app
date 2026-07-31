export const PROFILE_TEMPLATES = Object.freeze([
  'studio',
  'pulse',
  'aura',
  'frame',
]);

export function normalizeTemplateId(value) {
  return PROFILE_TEMPLATES.includes(value) ? value : 'studio';
}
