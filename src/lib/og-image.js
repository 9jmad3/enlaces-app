import { createRequire } from 'node:module';
import * as fontkit from 'fontkit';
import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;
const require = createRequire(import.meta.url);
const displayFont = fontkit.openSync(
  require.resolve('@fontsource/fraunces/files/fraunces-latin-700-normal.woff2'),
);
const bodyFont = fontkit.openSync(
  require.resolve('@fontsource/manrope/files/manrope-latin-600-normal.woff2'),
);
const strongFont = fontkit.openSync(
  require.resolve('@fontsource/manrope/files/manrope-latin-800-normal.woff2'),
);

function safeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;
}

function readableTextColor(background) {
  const [red, green, blue] = background
    .slice(1)
    .match(/.{2}/g)
    .map((part) => Number.parseInt(part, 16));
  const brightness = ((red * 299) + (green * 587) + (blue * 114)) / 1000;
  return brightness > 145 ? '#17201D' : '#FFFFFF';
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

function vectorText(value, {
  font,
  x,
  y,
  size,
  fill,
  anchor = 'start',
  letterSpacing = 0,
  opacity = 1,
}) {
  const run = font.layout(String(value || ''));
  const scale = size / font.unitsPerEm;
  const advance = run.positions.reduce(
    (total, position) => total + (position.xAdvance * scale),
    0,
  ) + Math.max(0, run.glyphs.length - 1) * letterSpacing;
  let cursor = anchor === 'middle' ? x - (advance / 2) : x;

  const paths = run.glyphs.map((glyph, index) => {
    const position = run.positions[index];
    const glyphX = cursor + (position.xOffset * scale);
    const glyphY = y - (position.yOffset * scale);
    cursor += (position.xAdvance * scale) + letterSpacing;

    return `<path d="${glyph.path.toSVG()}" transform="translate(${glyphX} ${glyphY}) scale(${scale} ${-scale})"/>`;
  }).join('');

  return `<g fill="${fill}" opacity="${opacity}">${paths}</g>`;
}

function vectorTextLines(lines, options) {
  return lines.map((line, index) => vectorText(line, {
    ...options,
    y: options.y + (index * options.lineHeight),
  })).join('');
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
  const buttonText = readableTextColor(accent);
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
  const avatarFallback = initials(displayName);

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
        ${vectorText(avatarFallback, {
          font: displayFont,
          x: 217,
          y: 330,
          size: 88,
          fill: background,
          anchor: 'middle',
        })}
      `}

      ${vectorText(handle.toUpperCase(), {
        font: strongFont,
        x: 410,
        y: 166,
        size: 23,
        fill: accent,
        letterSpacing: 3,
      })}
      ${vectorTextLines(nameLines, {
        font: displayFont,
        x: 410,
        y: nameY,
        size: nameSize,
        fill: foreground,
        letterSpacing: -3,
        lineHeight: 76,
      })}
      ${vectorTextLines(taglineLines, {
        font: bodyFont,
        x: 414,
        y: taglineY,
        size: 31,
        fill: foreground,
        opacity: 0.76,
        lineHeight: 44,
      })}

      <g transform="translate(410 485)">
        <rect width="190" height="58" rx="29" fill="${accent}"/>
      </g>
      ${vectorText('VER ENLACES', {
        font: strongFont,
        x: 492,
        y: 523,
        size: 21,
        fill: buttonText,
        anchor: 'middle',
      })}
      <path d="M560 519 L574 505 M563 505 H574 V516" fill="none" stroke="${buttonText}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="946" y="535" width="192" height="76" rx="24" fill="${background}" opacity=".96"/>
      <g transform="translate(965 548)">
        <rect width="52" height="52" rx="15" fill="${foreground}"/>
      </g>
      ${vectorText('T', {
        font: displayFont,
        x: 991,
        y: 585,
        size: 28,
        fill: background,
        anchor: 'middle',
      })}
      ${vectorText('Trazli', {
        font: strongFont,
        x: 1029,
        y: 582,
        size: 23,
        fill: foreground,
      })}
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
