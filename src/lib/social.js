const PLATFORM_HOSTS = {
  instagram: new Set(['instagram.com', 'www.instagram.com']),
  tiktok: new Set(['tiktok.com', 'www.tiktok.com']),
  youtube: new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']),
};

export function normalizeSocialUrl(platform, value) {
  const raw = String(value || '').trim();
  if (!raw || !PLATFORM_HOSTS[platform]) return '';

  try {
    const candidate = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(candidate);
    if (url.protocol !== 'https:' || !PLATFORM_HOSTS[platform].has(url.hostname.toLowerCase())) {
      return '';
    }
    return url.toString();
  } catch {
    return '';
  }
}
