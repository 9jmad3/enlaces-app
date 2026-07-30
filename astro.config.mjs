import { defineConfig } from 'astro/config';



// https://astro.build/config
export default defineConfig({
  // Sustituir con SITE_URL en el despliegue si el dominio definitivo cambia.
  site: process.env.SITE_URL || 'https://enlaces-app-production.up.railway.app',
  trailingSlash: 'never',
});
