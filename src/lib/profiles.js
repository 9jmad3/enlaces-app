import { randomUUID } from 'node:crypto';
import { hasDatabase, query, transaction } from './db.js';
import { profiles as fallbackProfiles } from '../data/profiles.js';
import { safeUrl, validHex } from './validation.js';

function mapFallback(profile) {
  if (!profile) return null;
  return {
    id: 'fallback-jmaledom',
    slug: profile.slug,
    display_name: profile.name,
    tagline: profile.description,
    bio: profile.bio,
    avatar_url: profile.image,
    template_id: 'studio',
    background_color: '#EEF3F1',
    accent_color: '#E65336',
    text_color: '#17201D',
    published: true,
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
      'SELECT * FROM profiles WHERE slug = $1 AND published = TRUE',
      [slug],
    );
    const profile = result.rows[0];
    if (profile) {
      const links = await query(
        `SELECT id, title, url, enabled, position
         FROM profile_links
         WHERE profile_id = $1 AND enabled = TRUE
         ORDER BY position`,
        [profile.id],
      );
      return { ...profile, links: links.rows };
    }
  }

  return mapFallback(fallbackProfiles.find((profile) => profile.slug === slug));
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
      'SELECT id FROM profiles WHERE user_id = $1 FOR UPDATE',
      [userId],
    );
    const profileId = profileResult.rows[0]?.id;
    if (!profileId) throw new Error('Perfil no encontrado');

    await client.query(
      `UPDATE profiles SET
         slug = $1,
         display_name = $2,
         tagline = $3,
         bio = $4,
         avatar_url = $5,
         template_id = $6,
         background_color = $7,
         accent_color = $8,
         text_color = $9,
         published = $10,
         updated_at = NOW()
       WHERE id = $11`,
      [
        data.slug,
        data.displayName.slice(0, 60),
        data.tagline.slice(0, 100),
        data.bio.slice(0, 280),
        safeUrl(data.avatarUrl, { allowRelative: true }),
        ['studio', 'pulse'].includes(data.templateId) ? data.templateId : 'studio',
        validHex(data.backgroundColor, '#F3EFE7'),
        validHex(data.accentColor, '#E65336'),
        validHex(data.textColor, '#18201D'),
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
