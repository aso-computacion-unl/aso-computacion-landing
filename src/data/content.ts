// Content the components render, resolved once per build: the admin's `/api/public/content` when ADMIN_CONTENT_URL is
// set and answers with a valid payload, otherwise the committed ./fallback.json (plus the demo placeholders from
// ./site.ts). The loader never throws because of the admin; the production gate (../lib/admin-content/gate.ts) is what
// fails a production build that would ship the fallback or demo content. See docs/DEPLOY.md.
import type { ImageMetadata } from 'astro';
import { locales, type Locale } from '../i18n/locales';
import { composeSiteContent } from '../lib/admin-content/compose';
import { detectDemoContent, evaluateContentGate } from '../lib/admin-content/gate';
import { loadPublicContent } from '../lib/admin-content/load';
import fallback from './fallback.json';
import { demoBoardFun, demoCollage, demoEvents, demoFaqItems, demoPillars, copy } from './site';

// Flip to true once the board approves the join copy and its `demo` flag is gone: production then fails if it returns.
const STRICT_JOIN = false;

// Bundled images the fallback snapshot can point at (`/src/assets/...`), as Astro image metadata.
const bundled = import.meta.glob<ImageMetadata>('/src/assets/**/*.{jpg,jpeg,png,webp,avif}', {
	eager: true,
	import: 'default',
});

const adminUrl = process.env.ADMIN_CONTENT_URL ?? import.meta.env.ADMIN_CONTENT_URL;
// The gate reports the fallback itself, with the reason, so the loader's own one-line warning stays quiet.
const loaded = await loadPublicContent({ url: adminUrl, fallback, warn: () => {} });

const memo = new Map<Locale, ReturnType<typeof build>>();

function build(locale: Locale) {
	const landing = copy[locale];
	const resolved = composeSiteContent({
		loaded,
		now: new Date(),
		resolveLocal: (path) => bundled[path],
		locale,
		baseline: {
			site: landing.site,
			navLinks: landing.navLinks,
			anchors: landing.timelineAnchors,
			demo: {
				events: demoEvents,
				pillars: demoPillars,
				faqItems: demoFaqItems,
				boardFun: demoBoardFun,
				collage: demoCollage,
			},
		},
	});
	return {
		contentSource: resolved.source,
		site: resolved.site,
		navLinks: resolved.navLinks,
		timeline: resolved.timeline,
		nextEvent: resolved.nextEvent,
		pillars: resolved.pillars,
		faq: { ...landing.faqCopy, demo: resolved.faqIsDemo, items: resolved.faqItems, commands: resolved.faqCommands },
		team: resolved.team,
		socials: resolved.socials,
		collagePhotos: resolved.collage,
		news: resolved.news,
		latestNews: resolved.latestNews,
	};
}

// Runs the production content gate once per build, over every locale: throws to fail a production build that would
// ship the fallback or demo content, prints a warning otherwise.
function enforceContentGate() {
	const result = evaluateContentGate({
		env: process.env,
		url: adminUrl,
		source: loaded.source,
		reason: loaded.source === 'fallback' ? loaded.reason : undefined,
		demo: detectDemoContent(locales.map(getContent)),
		joinDemo: locales.some((locale) => copy[locale].join.demo),
		strictJoin: STRICT_JOIN,
	});
	if (result.status === 'fail') throw new Error(result.message);
	if (result.status === 'warn') console.warn(result.message);
}

// The resolved content in `locale` (the landing's own words; admin content stays as written). Composed once per locale.
export function getContent(locale: Locale = 'es') {
	let content = memo.get(locale);
	if (!content) {
		content = build(locale);
		memo.set(locale, content);
	}
	return content;
}

enforceContentGate();

export type SiteData = ReturnType<typeof getContent>;
