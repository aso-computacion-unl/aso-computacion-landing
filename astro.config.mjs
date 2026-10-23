// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Production URL: hreflang alternates and share links are absolute.
  site: 'https://aso-computacion-landing.pages.dev',
  // Spanish lives at the root, English under /en/ (see src/i18n/locales.ts).
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    routing: { prefixDefaultLocale: false }
  },
  vite: {
    plugins: [tailwindcss()]
  }
});