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
    spotify_url: '',
    spotify_enabled: false,
    youtube_url: '',
    youtube_enabled: false,
    published: true,
    updated_at: null,
    links: profile.links.map((link, index) => ({
      id: `fallback-${index}`,
      title: link.title,
      url: link.link,
      enabled: true,
      position: index,
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
        `SELECT id, title, url, enabled, position
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
    `SELECT id, title, url, enabled, position
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
         youtube_url = $14,
         youtube_enabled = $15,
         published = CASE WHEN suspended_at IS NULL THEN $16 ELSE FALSE END,
         updated_at = NOW()
       WHERE id = $17`,
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
        data.youtubeUrl,
        data.youtubeEnabled,
        data.published,
        profileId,
      ],
    );

    await client.query('DELETE FROM profile_links WHERE profile_id = $1', [profileId]);
    for (const [position, link] of data.links.entries()) {
      const url = safeUrl(link.url);
      const title = String(link.title || '').trim().slice(0, 60);
      if (!title || !url) continue;

      await client.query(
        `INSERT INTO profile_links
          (id, profile_id, title, url, enabled, position)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [randomUUID(), profileId, title, url, link.enabled, position],
      );
    }
  });
}
