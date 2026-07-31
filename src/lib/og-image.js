import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;

function escapeXml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function safeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;
}

function initials(name) {
  return String(name || 'Trazli')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function wrapText(value, maxCharacters = 39, maxLines = 2) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];

  for (const originalWord of words) {
    const word = originalWord.length > maxCharacters
      ? `${originalWord.slice(0, maxCharacters - 1)}…`
      : originalWord;
    const current = lines.at(-1);
    if (!current || current.length + word.length + 1 > maxCharacters) {
      if (lines.length === maxLines) {
        lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, -1)}…`;
        break;
      }
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${current} ${word}`;
    }
  }

  return lines;
}

function svgTextLines(lines, x, y, lineHeight) {
  return lines.map((line, index) => (
    `<text x="${x}" y="${y + (index * lineHeight)}">${escapeXml(line)}</text>`
  )).join('');
}

async function prepareAvatar(avatar, circular = false) {
  if (!avatar?.content) return null;

  try {
    const mask = Buffer.from(
      `<svg width="270" height="270"><rect width="270" height="270" rx="${circular ? 135 : 54}" fill="white"/></svg>`,
    );

    return await sharp(avatar.content)
      .rotate()
      .resize(270, 270, { fit: 'cover', position: 'attention' })
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

export async function renderProfileOgImage(profile, avatar = null) {
  const background = safeColor(profile.background_color, '#EEF3F1');
  const accent = safeColor(profile.accent_color, '#E65336');
  const foreground = safeColor(profile.text_color, '#17201D');
  const displayName = String(profile.display_name || 'Trazli').trim().slice(0, 60);
  const tagline = String(profile.tagline || profile.bio || 'Todo lo tuyo, en un solo enlace.')
    .trim()
    .slice(0, 140);
  const handle = profile.slug ? `@${profile.slug}` : 'TRAZLI.COM';
  const pulse = profile.template_id === 'pulse';
  const nameLines = wrapText(displayName, 22, 2);
  const longestNameLine = Math.max(...nameLines.map((line) => line.length));
  const nameSize = longestNameLine > 18 ? 64 : longestNameLine > 14 ? 76 : 88;
  const nameY = nameLines.length > 1 ? 232 : 270;
  const taglineY = nameLines.length > 1 ? 390 : 335;
  const taglineLines = wrapText(tagline);
  const avatarImage = await prepareAvatar(avatar, pulse);
  const avatarFallback = escapeXml(initials(displayName));

  const decoration = pulse
    ? `
      <circle cx="1090" cy="90" r="190" fill="${accent}"/>
      <rect x="930" y="430" width="300" height="300" rx="54" fill="${foreground}" transform="rotate(-12 1080 580)"/>
      <path d="M0 570 L470 570 L420 630 L0 630 Z" fill="${accent}"/>
    `
    : `
      <circle cx="1085" cy="115" r="250" fill="none" stroke="${accent}" stroke-width="78" opacity=".72"/>
      <circle cx="1110" cy="565" r="150" fill="${accent}" opacity=".34"/>
      <path d="M0 580 C250 505 420 670 690 570 L690 630 L0 630 Z" fill="${accent}" opacity=".7"/>
    `;

  const svg = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
          <path d="M42 0H0V42" fill="none" stroke="${foreground}" stroke-width="1" opacity=".09"/>
        </pattern>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="${background}"/>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grid)"/>
      ${decoration}

      <rect x="62" y="160" width="290" height="290" rx="${pulse ? 145 : 65}" fill="${foreground}" opacity=".14"/>
      <rect x="72" y="150" width="290" height="290" rx="${pulse ? 145 : 65}" fill="${background}" stroke="${foreground}" stroke-width="${pulse ? 10 : 3}"/>
      ${avatarImage ? '' : `
        <rect x="82" y="160" width="270" height="270" rx="${pulse ? 135 : 54}" fill="${accent}"/>
        <text x="217" y="330" text-anchor="middle" fill="${background}" font-family="Georgia, serif" font-size="88" font-weight="700">${avatarFallback}</text>
      `}

      <text x="410" y="166" fill="${accent}" font-family="Arial, sans-serif" font-size="23" font-weight="800" letter-spacing="3">${escapeXml(handle.toUpperCase())}</text>
      <g fill="${foreground}" font-family="Georgia, serif" font-size="${nameSize}" font-weight="700" letter-spacing="-3">
        ${svgTextLines(nameLines, 410, nameY, 76)}
      </g>
      <g fill="${foreground}" opacity=".76" font-family="Arial, sans-serif" font-size="31" font-weight="600">
        ${svgTextLines(taglineLines, 414, taglineY, 44)}
      </g>

      <g transform="translate(410 485)">
        <rect width="190" height="58" rx="29" fill="${accent}"/>
        <text x="95" y="38" text-anchor="middle" fill="${background}" font-family="Arial, sans-serif" font-size="21" font-weight="800">VER ENLACES ↗</text>
      </g>
      <g transform="translate(965 548)">
        <rect width="52" height="52" rx="15" fill="${foreground}"/>
        <text x="26" y="37" text-anchor="middle" fill="${background}" font-family="Georgia, serif" font-size="28" font-weight="700">T</text>
        <text x="64" y="34" fill="${foreground}" font-family="Arial, sans-serif" font-size="23" font-weight="800">Trazli</text>
      </g>
    </svg>
  `);

  const composites = avatarImage
    ? [{ input: avatarImage, left: 82, top: 160 }]
    : [];

  return sharp(svg)
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

export function renderSiteOgImage() {
  return renderProfileOgImage({
    slug: '',
    display_name: 'Todo lo tuyo.',
    tagline: 'Un solo enlace. Una página que se siente realmente tuya.',
    template_id: 'studio',
    background_color: '#F7F4ED',
    accent_color: '#E65336',
    text_color: '#17201D',
  });
}
