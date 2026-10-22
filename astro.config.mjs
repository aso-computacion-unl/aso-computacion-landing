// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  image: {
    // Photos uploaded through the admin are served by Cloudinary; Astro only optimizes remote images from allowed hosts.
    domains: ['res.cloudinary.com']
  },
  vite: {
    plugins: [tailwindcss()]
  }
});