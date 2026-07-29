import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: ['enlaces-app-production.up.railway.app'],
  },
  preview: {
    allowedHosts: ['enlaces-app-production.up.railway.app'],
  },
});
