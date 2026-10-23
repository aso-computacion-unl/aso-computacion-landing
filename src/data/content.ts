// Content the components render, resolved once per build: the admin's `/api/public/content` when ADMIN_CONTENT_URL is
// set and answers with a valid payload, otherwise the committed ./fallback.json (plus the demo placeholders from
// ./site.ts). It never throws because of the admin, so a build can never fail on it. See README.md.
import type { ImageMetadata } from 'astro';
import { composeSiteContent } from '../lib/admin-content/compose';
import { loadPublicContent } from '../lib/admin-content/load';
import fallback from './fallback.json';
import {
	demoBoardFun,
	demoCollage,
	demoEvents,
	demoFaqItems,
	demoPillars,
	faqCopy,
	navLinks as baseNavLinks,
	site as baseSite,
	timelineAnchors,
} from './site';

// Bundled images the fallback snapshot can point at (`/src/assets/...`), as Astro image metadata.
const bundled = import.meta.glob<ImageMetadata>('/src/assets/**/*.{jpg,jpeg,png,webp,avif}', { eager: true, import: 'default' });

const loaded = await loadPublicContent({
	url: process.env.ADMIN_CONTENT_URL ?? import.meta.env.ADMIN_CONTENT_URL,
	fallback,
});

const resolved = composeSiteContent({
	loaded,
	now: new Date(),
	resolveLocal: (path) => bundled[path],
	baseline: {
		site: baseSite,
		navLinks: baseNavLinks,
		anchors: timelineAnchors,
		demo: { events: demoEvents, pillars: demoPillars, faqItems: demoFaqItems, boardFun: demoBoardFun, collage: demoCollage },
	},
});

export const contentSource = resolved.source;
export const site = resolved.site;
export const navLinks = resolved.navLinks;
export const timeline = resolved.timeline;
export const nextEvent = resolved.nextEvent;
export const pillars = resolved.pillars;
export const faq = { ...faqCopy, demo: resolved.faqIsDemo, items: resolved.faqItems };
export const team = resolved.team;
export const socials = resolved.socials;
export const collagePhotos = resolved.collage;
export const news = resolved.news;
export const latestNews = resolved.latestNews;
