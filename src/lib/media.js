const SPOTIFY_TRACK_ID = /^[A-Za-z0-9]{22}$/;
const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

function parseUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  try {
    return new URL(/^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

export function getSpotifyTrackId(value) {
  const url = parseUrl(value);
  if (!url || url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'open.spotify.com') return '';

  const parts = url.pathname.split('/').filter(Boolean);
  const trackIndex = parts.findIndex((part) => part.toLowerCase() === 'track');
  const trackId = trackIndex >= 0 ? parts[trackIndex + 1] : '';
  return SPOTIFY_TRACK_ID.test(trackId || '') ? trackId : '';
}

export function normalizeSpotifyTrackUrl(value) {
  const trackId = getSpotifyTrackId(value);
  return trackId ? `https://open.spotify.com/track/${trackId}` : '';
}

export function getYouTubeVideoId(value) {
  const url = parseUrl(value);
  if (!url || url.protocol !== 'https:') return '';

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  let videoId = '';

  if (hostname === 'youtu.be') {
    videoId = url.pathname.split('/').filter(Boolean)[0] || '';
  } else if (['youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(hostname)) {
    const parts = url.pathname.split('/').filter(Boolean);
    if (url.pathname === '/watch') videoId = url.searchParams.get('v') || '';
    if (['shorts', 'embed', 'live'].includes(parts[0])) videoId = parts[1] || '';
  }

  return YOUTUBE_VIDEO_ID.test(videoId) ? videoId : '';
}

export function normalizeYouTubeVideoUrl(value) {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : '';
}

export function getSpotifyEmbedUrl(value) {
  const trackId = getSpotifyTrackId(value);
  return trackId ? `https://open.spotify.com/embed/track/${trackId}` : '';
}

export function getYouTubeEmbedUrl(value) {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0` : '';
}

export function normalizeMediaPosition(value, fallback) {
  const position = Number(value);
  return Number.isInteger(position) ? Math.min(7, Math.max(0, position)) : fallback;
}
