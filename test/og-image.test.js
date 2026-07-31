import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { renderProfileOgImage, renderSiteOgImage } from '../src/lib/og-image.js';

test('renders a social image with the expected Open Graph dimensions', async () => {
  const image = await renderProfileOgImage({
    slug: 'ejemplo',
    display_name: 'Perfil de ejemplo',
    tagline: 'Una tarjeta preparada para compartir.',
    template_id: 'pulse',
    background_color: '#EEF3F1',
    accent_color: '#E65336',
    text_color: '#17201D',
  });
  const metadata = await sharp(image).metadata();

  assert.equal(metadata.format, 'png');
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 630);
});

test('renders the default Trazli social image', async () => {
  const image = await renderSiteOgImage();
  assert.ok(image.length > 10_000);
});
