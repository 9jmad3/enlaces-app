import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: ['.up.railway.app'],
  },
  preview: {
    allowedHosts: ['.up.railway.app'],
  },
});
