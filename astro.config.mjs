import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://enlaces-app-production.up.railway.app',
  trailingSlash: 'never',
  security: {
    // Railway terminates HTTPS at its proxy, so origin validation is handled
    // in our POST endpoints using the forwarded public host.
    checkOrigin: false,
  },
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
});
