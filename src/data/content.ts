// Content the components render, resolved once per build: the admin's `/api/public/content` when ADMIN_CONTENT_URL is
// set and answers with a valid payload, otherwise the committed ./fallback.json (plus the demo placeholders from
// ./site.ts). The loader never throws because of the admin; the production gate (../lib/admin-content/gate.ts) is what
// fails a production build that would ship the fallback or demo content. See docs/DEPLOY.md.
import type { ImageMetadata } from 'astro';
import { locales, type Locale } from '../i18n/locales';
import { composeSiteContent } from '../lib/admin-content/compose';
import { adminOriginOf, forumUrl } from '../lib/admin-content/forum';
import { detectDemoContent, evaluateContentGate } from '../lib/admin-content/gate';
import { loadPublicContent } from '../lib/admin-content/load';
import { loadPreviewContent, readPreviewConfig } from '../lib/admin-content/preview';
import { openFormWithoutSiteKey } from '../lib/registration/rules';
import { seatsUrl } from '../lib/registration/seats';
import { chooseTickets } from '../lib/registration/tickets';
import fallback from './fallback.json';
import { demoBoardFun, demoCollage, demoEvents, demoFaqItems, demoPillars, copy } from './site';

// Flip to true once the board approves the join copy and its `demo` flag is gone: production then fails if it returns.
const STRICT_JOIN = false;
// Same for the forum section's example threads: flip once they are real (or the board approves them) and `demo` is gone.
const STRICT_FORUM = false;

// Bundled images the fallback snapshot can point at (`/src/assets/...`), as Astro image metadata.
const bundled = import.meta.glob<ImageMetadata>('/src/assets/**/*.{jpg,jpeg,png,webp,avif}', {
	eager: true,
	import: 'default',
});

const adminUrl = process.env.ADMIN_CONTENT_URL ?? import.meta.env.ADMIN_CONTENT_URL;
// A preview build (PREVIEW_BUILD=1, see docs/DEPLOY.md) reads drafts and scheduled content instead, and throws, failing
// the build, on anything short of a valid preview: it never falls back. Normal builds never read these variables' values.
const preview = readPreviewConfig(process.env);
// The gate reports the fallback itself, with the reason, so the loader's own one-line warning stays quiet.
const loaded = preview
	? await loadPreviewContent(preview)
	: await loadPublicContent({ url: adminUrl, fallback, warn: () => {} });

// The forum lives on the admin's origin: the one the content came from (the preview's, in a preview build). Unknown or
// unsafe, there is no forum link (fail closed, like the registration links), and the tickets never ask for their seats.
const adminOrigin = adminOriginOf(preview ? preview.url : adminUrl);
const forumLink = forumUrl(adminOrigin);
const seatsLink = seatsUrl(adminOrigin);

// Public Cloudflare Turnstile site key (S8): the open registration form needs it to show its widget. Without it the form
// is not rendered and the build says so (below). The secret half lives in the admin (TURNSTILE_SECRET_KEY).
export const turnstileSiteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY?.trim() || undefined;

// A registration link the payload put on another origin was left out (validate.ts): say which, once per build.
for (const warning of loaded.warnings ?? []) console.warn(`[registration] ${warning}`);

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
		// True on a preview build: the layout adds the banner and noindex, and the site is never meant to be public.
		preview: resolved.source === 'preview',
		site: resolved.site,
		// No ticket to show (nothing upcoming, or only open forms without the Turnstile key): no link to the section either.
		navLinks: resolved.navLinks.filter(
			(link) => link.href !== '#inscripciones' || chooseTickets(resolved.timeline, turnstileSiteKey).length > 0,
		),
		timeline: resolved.timeline,
		nextEvent: resolved.nextEvent,
		pillars: resolved.pillars,
		forum: { ...landing.forum, url: forumLink },
		// The admin's public seats endpoint, when its origin is known.
		seatsUrl: seatsLink,
		faq: { ...landing.faqCopy, demo: resolved.faqIsDemo, items: resolved.faqItems, commands: resolved.faqCommands },
		team: resolved.team,
		socials: resolved.socials,
		collagePhotos: resolved.collage,
		news: resolved.news,
		latestNews: resolved.latestNews,
		impact: resolved.impact,
		testimonials: resolved.testimonials,
		sponsors: resolved.sponsors,
	};
}

// Runs the production content gate once per build, over every locale: throws to fail a production build that would
// ship the fallback or demo content, prints a warning otherwise.
function enforceContentGate() {
	const result = evaluateContentGate({
		env: process.env,
		url: adminUrl,
		// A preview cannot fall back, so the fallback check has nothing to say about it.
		source: loaded.source === 'fallback' ? 'fallback' : 'api',
		reason: loaded.source === 'fallback' ? loaded.reason : undefined,
		demo: detectDemoContent(locales.map(getContent)),
		joinDemo: locales.some((locale) => copy[locale].join.demo),
		strictJoin: STRICT_JOIN,
		forumDemo: locales.some((locale) => copy[locale].forum.demo),
		strictForum: STRICT_FORUM,
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

const noSiteKey = openFormWithoutSiteKey(getContent('es').timeline, turnstileSiteKey);
if (noSiteKey.length > 0)
	console.warn(
		`[registration] PUBLIC_TURNSTILE_SITE_KEY is not set: the open registration form of ${noSiteKey.join(', ')} is not shown. See docs/DEPLOY.md.`,
	);

export type SiteData = ReturnType<typeof getContent>;
