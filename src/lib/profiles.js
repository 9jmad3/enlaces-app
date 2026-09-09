import { randomUUID } from 'node:crypto';
import { hasDatabase, query, transaction } from './db.js';
import { profiles as fallbackProfiles } from '../data/profiles.js';
import { normalizeTemplateId } from './templates.js';
import { safeUrl, validHex } from './validation.js';

function mapFallback(profile) {
  if (!profile) return null;
  return {
    id: `fallback-${profile.slug}`,
    slug: profile.slug,
    display_name: profile.name,
    tagline: profile.description,
    bio: profile.bio,
    avatar_url: profile.image,
    avatar_position_x: 50,
    avatar_position_y: 20,
    template_id: 'studio',
    background_color: '#EEF3F1',
    accent_color: '#E65336',
    text_color: '#17201D',
    link_color: '#E65336',
    link_color_enabled: false,
    spotify_url: '',
    spotify_enabled: false,
    spotify_position: 6,
    youtube_url: '',
    youtube_enabled: false,
    youtube_position: 7,
    instagram_url: '',
    instagram_enabled: false,
    tiktok_url: '',
    tiktok_enabled: false,
    youtube_social_url: '',
    youtube_social_enabled: false,
    published: true,
    updated_at: null,
    links: profile.links.map((link, index) => ({
      id: `fallback-${index}`,
      title: link.title,
      url: link.link,
      enabled: true,
      position: index,
      section_title: '',
    })),
  };
}

export async function getPublicProfile(slug) {
  if (hasDatabase()) {
    const result = await query(
      `SELECT * FROM profiles
       WHERE slug = $1`,
      [slug],
    );
    const profile = result.rows[0];
    if (profile?.published && !profile.suspended_at) {
      const links = await query(
        `SELECT id, title, url, enabled, position, section_title
         FROM profile_links
         WHERE profile_id = $1 AND enabled = TRUE
         ORDER BY position`,
        [profile.id],
      );
      return { ...profile, links: links.rows };
    }
    if (profile) return null;
  }

  return mapFallback(fallbackProfiles.find((profile) => profile.slug === slug));
}

export async function getPublishedProfiles() {
  const fallback = fallbackProfiles.map((profile) => ({
    slug: profile.slug,
    updated_at: null,
  }));

  if (!hasDatabase()) return fallback;

  const [publishedResult, existingResult] = await Promise.all([
    query(
      `SELECT slug, updated_at
       FROM profiles
       WHERE published = TRUE AND suspended_at IS NULL
       ORDER BY slug`,
    ),
    query('SELECT slug FROM profiles'),
  ]);
  const databaseSlugs = new Set(existingResult.rows.map((profile) => profile.slug));

  return [
    ...publishedResult.rows,
    ...fallback.filter((profile) => !databaseSlugs.has(profile.slug)),
  ];
}

export async function getPublicProfileAvatar(profileId) {
  if (!hasDatabase() || !profileId || String(profileId).startsWith('fallback-')) {
    return null;
  }

  const result = await query(
    `SELECT a.content_type, a.content, a.etag
     FROM profile_avatars a
     JOIN profiles p ON p.id = a.profile_id
     WHERE a.profile_id = $1
       AND p.published = TRUE
       AND p.suspended_at IS NULL`,
    [profileId],
  );

  return result.rows[0] || null;
}

export async function getEditableProfile(userId) {
  const result = await query(
    'SELECT * FROM profiles WHERE user_id = $1',
    [userId],
  );
  const profile = result.rows[0];
  if (!profile) return null;

  const links = await query(
    `SELECT id, title, url, enabled, position, section_title
     FROM profile_links
     WHERE profile_id = $1
     ORDER BY position`,
    [profile.id],
  );

  return { ...profile, links: links.rows };
}

export async function isSlugAvailable(slug, excludeUserId = '') {
  const isFallbackSlug = fallbackProfiles.some(
    (profile) => profile.slug.toLowerCase() === slug.toLowerCase(),
  );

  if (isFallbackSlug) {
    if (!excludeUserId) return false;

    const ownedFallback = await query(
      'SELECT 1 FROM profiles WHERE slug = $1 AND user_id = $2 LIMIT 1',
      [slug, excludeUserId],
    );
    return ownedFallback.rowCount > 0;
  }

  const result = excludeUserId
    ? await query(
        'SELECT 1 FROM profiles WHERE slug = $1 AND user_id <> $2 LIMIT 1',
        [slug, excludeUserId],
      )
    : await query(
        'SELECT 1 FROM profiles WHERE slug = $1 LIMIT 1',
        [slug],
      );

  return result.rowCount === 0;
}

export async function saveProfile(userId, data) {
  return transaction(async (client) => {
    const profileResult = await client.query(
      'SELECT id, avatar_url FROM profiles WHERE user_id = $1 FOR UPDATE',
      [userId],
    );
    const currentProfile = profileResult.rows[0];
    const profileId = currentProfile?.id;
    if (!profileId) throw new Error('Perfil no encontrado');

    let avatarUrl = currentProfile.avatar_url;
    if (data.removeAvatar) {
      await client.query('DELETE FROM profile_avatars WHERE profile_id = $1', [profileId]);
      avatarUrl = '';
    } else if (data.avatar) {
      await client.query(
        `INSERT INTO profile_avatars
          (profile_id, content_type, content, etag, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (profile_id) DO UPDATE SET
           content_type = EXCLUDED.content_type,
           content = EXCLUDED.content,
           etag = EXCLUDED.etag,
           updated_at = NOW()`,
        [profileId, data.avatar.contentType, data.avatar.content, data.avatar.etag],
      );
      avatarUrl = `/api/avatar/${profileId}?v=${data.avatar.etag.slice(0, 12)}`;
    }

    await client.query(
      `UPDATE profiles SET
         slug = $1,
         display_name = $2,
         tagline = $3,
         bio = $4,
         avatar_url = $5,
         avatar_position_x = $6,
         avatar_position_y = $7,
         template_id = $8,
         background_color = $9,
         accent_color = $10,
         text_color = $11,
         spotify_url = $12,
         spotify_enabled = $13,
         spotify_position = $14,
         youtube_url = $15,
         youtube_enabled = $16,
         youtube_position = $17,
         instagram_url = $18,
         instagram_enabled = $19,
         tiktok_url = $20,
         tiktok_enabled = $21,
         youtube_social_url = $22,
         youtube_social_enabled = $23,
         link_color = $24,
         link_color_enabled = $25,
         published = CASE WHEN suspended_at IS NULL THEN $26 ELSE FALSE END,
         updated_at = NOW()
       WHERE id = $27`,
      [
        data.slug,
        data.displayName.slice(0, 60),
        data.tagline.slice(0, 100),
        data.bio.slice(0, 280),
        safeUrl(avatarUrl, { allowRelative: true }),
        data.avatarPositionX,
        data.avatarPositionY,
        normalizeTemplateId(data.templateId),
        validHex(data.backgroundColor, '#F3EFE7'),
        validHex(data.accentColor, '#E65336'),
        validHex(data.textColor, '#18201D'),
        data.spotifyUrl,
        data.spotifyEnabled,
        data.spotifyPosition,
        data.youtubeUrl,
        data.youtubeEnabled,
        data.youtubePosition,
        data.instagramUrl,
        data.instagramEnabled,
        data.tiktokUrl,
        data.tiktokEnabled,
        data.youtubeSocialUrl,
        data.youtubeSocialEnabled,
        validHex(data.linkColor, '#E65336'),
        data.linkColorEnabled,
        data.published,
        profileId,
      ],
    );

    await client.query('DELETE FROM profile_links WHERE profile_id = $1', [profileId]);
    for (const [position, link] of data.links.entries()) {
      const url = safeUrl(link.url);
      const title = String(link.title || '').trim().slice(0, 60);
      const sectionTitle = String(link.sectionTitle || '').trim().slice(0, 80);
      if (!title || !url) continue;

      await client.query(
        `INSERT INTO profile_links
          (id, profile_id, title, url, enabled, position, section_title)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [randomUUID(), profileId, title, url, link.enabled, position, sectionTitle],
      );
    }
  });
}
