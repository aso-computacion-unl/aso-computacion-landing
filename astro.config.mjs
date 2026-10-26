// @ts-check
import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import { assertPreviewAllowed, isPreviewBuild } from './src/lib/admin-content/preview.ts';

// A preview build (PREVIEW_BUILD=1, see docs/DEPLOY.md) shows drafts: no sitemap, and every response asks crawlers to
// stay away, whatever its type (the pages also carry their own noindex meta).
const preview = isPreviewBuild(process.env);
// Fail before anything is built if this is the public Cloudflare Pages project (docs/DEPLOY.md#preview-builds).
assertPreviewAllowed(process.env);

/** @type {import('astro').AstroIntegration} */
const previewHeaders = {
	name: 'preview-headers',
	hooks: {
		'astro:build:done': async ({ dir }) => {
			await appendFile(path.join(fileURLToPath(dir), '_headers'), '\n/*\n  X-Robots-Tag: noindex, nofollow\n');
		},
	},
};

// https://astro.build/config
export default defineConfig({
	// Production URL: hreflang alternates and share links are absolute.
	site: 'https://aso-computacion-landing.pages.dev',
	// Spanish lives at the root, English under /en/ (see src/i18n/locales.ts).
	i18n: {
		locales: ['es', 'en'],
		defaultLocale: 'es',
		routing: { prefixDefaultLocale: false },
	},
	// sitemap-index.xml lists every page with its hreflang alternates; robots.txt points at it (src/pages/robots.txt.ts).
	integrations: preview
		? [previewHeaders]
		: [sitemap({ i18n: { defaultLocale: 'es', locales: { es: 'es-EC', en: 'en-US' } } })],
	vite: {
		plugins: [tailwindcss()],
	},
});
