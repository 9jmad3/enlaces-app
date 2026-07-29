import { defineConfig } from 'astro/config';



// https://astro.build/config
export default defineConfig({
  integrations: [],
  site: process.env.PUBLIC_SITE_URL ?? 'http://localhost:4321',
  server: {
    allowedHosts: ['.up.railway.app'],
  },
  vite: {
    preview: {
      allowedHosts: ['.up.railway.app'],
    },
  },
});
