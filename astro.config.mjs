import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://enlaces-app-production.up.railway.app',
  trailingSlash: 'never',
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
});
