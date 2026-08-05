import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSpotifyEmbedUrl,
  getYouTubeEmbedUrl,
  normalizeSpotifyTrackUrl,
  normalizeYouTubeVideoUrl,
} from '../src/lib/media.js';

const spotifyId = '4uLU6hMCjMI75M1A2tKUQC';
const youtubeId = 'dQw4w9WgXcQ';

test('normalizes Spotify track links and rejects other Spotify content', () => {
  assert.equal(
    normalizeSpotifyTrackUrl(`https://open.spotify.com/intl-es/track/${spotifyId}?si=secret`),
    `https://open.spotify.com/track/${spotifyId}`,
  );
  assert.equal(normalizeSpotifyTrackUrl('https://open.spotify.com/album/invalid'), '');
  assert.equal(normalizeSpotifyTrackUrl('https://example.com/track/4uLU6hMCjMI75M1A2tKUQC'), '');
});

test('normalizes common YouTube video URLs', () => {
  assert.equal(normalizeYouTubeVideoUrl(`https://youtu.be/${youtubeId}?feature=share`), `https://www.youtube.com/watch?v=${youtubeId}`);
  assert.equal(normalizeYouTubeVideoUrl(`https://www.youtube.com/shorts/${youtubeId}`), `https://www.youtube.com/watch?v=${youtubeId}`);
  assert.equal(normalizeYouTubeVideoUrl(`https://music.youtube.com/watch?v=${youtubeId}`), `https://www.youtube.com/watch?v=${youtubeId}`);
  assert.equal(normalizeYouTubeVideoUrl('https://example.com/watch?v=dQw4w9WgXcQ'), '');
});

test('builds privacy-conscious media embed URLs', () => {
  assert.equal(getSpotifyEmbedUrl(`https://open.spotify.com/track/${spotifyId}`), `https://open.spotify.com/embed/track/${spotifyId}`);
  assert.equal(getYouTubeEmbedUrl(`https://www.youtube.com/watch?v=${youtubeId}`), `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`);
});
