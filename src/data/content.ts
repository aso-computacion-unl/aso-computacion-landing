// Content the components render, resolved once per build: the admin's `/api/public/content` when ADMIN_CONTENT_URL is
// set and answers with a valid payload, otherwise the committed ./fallback.json (plus the demo placeholders from
// ./site.ts). It never throws because of the admin, so a build can never fail on it. See README.md.
import type { ImageMetadata } from 'astro';
import type { Locale } from '../i18n/locales';
import { composeSiteContent } from '../lib/admin-content/compose';
import { loadPublicContent } from '../lib/admin-content/load';
import fallback from './fallback.json';
import {
	demoBoardFun,
	demoCollage,
	demoEvents,
	demoFaqItems,
	demoPillars,
	copy,
} from './site';

// Bundled images the fallback snapshot can point at (`/src/assets/...`), as Astro image metadata.
const bundled = import.meta.glob<ImageMetadata>('/src/assets/**/*.{jpg,jpeg,png,webp,avif}', { eager: true, import: 'default' });

const loaded = await loadPublicContent({
	url: process.env.ADMIN_CONTENT_URL ?? import.meta.env.ADMIN_CONTENT_URL,
	fallback,
});

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
			demo: { events: demoEvents, pillars: demoPillars, faqItems: demoFaqItems, boardFun: demoBoardFun, collage: demoCollage },
		},
	});
	return {
		contentSource: resolved.source,
		site: resolved.site,
		navLinks: resolved.navLinks,
		timeline: resolved.timeline,
		nextEvent: resolved.nextEvent,
		pillars: resolved.pillars,
		faq: { ...landing.faqCopy, demo: resolved.faqIsDemo, items: resolved.faqItems },
		team: resolved.team,
		socials: resolved.socials,
		collagePhotos: resolved.collage,
		news: resolved.news,
		latestNews: resolved.latestNews,
	};
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

export type SiteData = ReturnType<typeof getContent>;

// Transitional: pages and components still read the Spanish content by name until they take their language from
// Astro.currentLocale and call getContent() themselves.
const spanish = getContent('es');
export const contentSource = spanish.contentSource;
export const site = spanish.site;
export const navLinks = spanish.navLinks;
export const timeline = spanish.timeline;
export const nextEvent = spanish.nextEvent;
export const pillars = spanish.pillars;
export const faq = spanish.faq;
export const team = spanish.team;
export const socials = spanish.socials;
export const collagePhotos = spanish.collagePhotos;
export const news = spanish.news;
export const latestNews = spanish.latestNews;
