// Puts the pieces together: the resolved content (admin API or fallback snapshot) plus the landing's own copy and,
// on the fallback path only, the demo placeholders. Pure: `now` and the bundled-image lookup are passed in.
import type { LoadedContent } from './load';
import { countWord, toBoard, toFaqItems, toPillars, toSite, toSocials, type MapContext } from './map';
import type { BoardFun, FaqItem, Photo, Pillar, SiteCopy, Social, TeamMember, TimelineEntry } from './model';
import { sortEvents, toTimelineEntry, todayInEcuador } from './timeline';

// What the landing owns in code: its copy, the three structural timeline entries and the demo placeholders.
export interface Baseline {
	site: SiteCopy;
	navLinks: { label: string; href: string }[];
	anchors: { next: TimelineEntry; head: TimelineEntry; initial: TimelineEntry };
	demo: {
		// Dated placeholder events; their kind is derived from the date like any other event.
		events: Omit<TimelineEntry, 'kind'>[];
		pillars: Pillar[];
		faqItems: FaqItem[];
		// Playful "git show" extras keyed by member name. Invented, so never sent to or taken from the admin (S4).
		boardFun: Record<string, BoardFun>;
		// Stock photos that only fill out the Join collage.
		collage: Photo[];
	};
}

export interface SiteContent {
	source: LoadedContent['source'];
	site: SiteCopy;
	navLinks: { label: string; href: string }[];
	timeline: TimelineEntry[];
	nextEvent: TimelineEntry | undefined;
	pillars: Pillar[];
	faqItems: FaqItem[];
	// True while the FAQ shown is the demo placeholder set (drives the section's "demo" tag).
	faqIsDemo: boolean;
	team: TeamMember[];
	socials: Social[];
	collage: Photo[];
}

export const COLLAGE_EVENT_PHOTOS = 12;

const headEntry = (base: TimelineEntry, members: number): TimelineEntry => {
	const { description: _description, href: _href, hrefLabel: _hrefLabel, ...rest } = base;
	if (members === 0) return rest;
	const description =
		members === 1
			? 'Una persona representa hoy a los estudiantes de la carrera.'
			: `${countWord(members).replace(/^./, (letter) => letter.toUpperCase())} integrantes representan hoy a los estudiantes de la carrera.`;
	return { ...rest, description, href: base.href, hrefLabel: base.hrefLabel };
};

export function composeSiteContent(options: {
	loaded: LoadedContent;
	baseline: Baseline;
	now: Date;
	resolveLocal: MapContext['resolveLocal'];
}): SiteContent {
	const { loaded, baseline, now, resolveLocal } = options;
	const { content, source } = loaded;
	// Placeholders are a fallback-path concern: once the admin answers, its content is the whole truth.
	const withDemo = source === 'fallback';
	const ctx: MapContext = { today: todayInEcuador(now), resolveLocal };

	const demoEntries: TimelineEntry[] = withDemo
		? baseline.demo.events.map((entry) => ({ ...entry, kind: entry.date && entry.date >= ctx.today ? 'upcoming' : 'commit' }))
		: [];
	const entries = sortEvents([...sortEvents(content.events).map((event) => toTimelineEntry(event, ctx)), ...demoEntries]);
	const upcoming = entries.filter((entry) => entry.kind === 'upcoming');
	const history = entries.filter((entry) => entry.kind !== 'upcoming');

	const team = toBoard(content.board, ctx, withDemo ? baseline.demo.boardFun : {});
	const timeline = [baseline.anchors.next, ...upcoming, headEntry(baseline.anchors.head, team.length), ...history, baseline.anchors.initial];

	// Nearest dated upcoming entry: feeds the countdown panel and the "¡nuevo!" sticker.
	const nextEvent = upcoming.filter((entry) => entry.date).reduce<TimelineEntry | undefined>((nearest, entry) => (!nearest || (entry.date ?? '') < (nearest.date ?? '') ? entry : nearest), undefined);

	const pillars = content.pillars.length > 0 || !withDemo ? toPillars(content.pillars, ctx) : baseline.demo.pillars;
	const faqIsDemo = withDemo && content.faqs.length === 0 && baseline.demo.faqItems.length > 0;
	const faqItems = faqIsDemo ? baseline.demo.faqItems : toFaqItems(content.faqs);
	const socials = toSocials(content.socials);

	const seen = new Set<Photo['src']>();
	const eventPhotos = timeline
		.flatMap((entry) => entry.gallery ?? (entry.image ? [entry.image] : []))
		.filter((photo) => !seen.has(photo.src) && seen.add(photo.src))
		.slice(0, COLLAGE_EVENT_PHOTOS);
	const collage = [...eventPhotos, ...(withDemo ? baseline.demo.collage : [])];

	const hasContent: Record<string, boolean> = { '#faq': faqItems.length > 0, '#directiva': team.length > 0, '#redes': socials.length > 0 };
	const navLinks = baseline.navLinks.filter((link) => hasContent[link.href] ?? true);

	return { source, site: toSite(baseline.site, content.settings), navLinks, timeline, nextEvent, pillars, faqItems, faqIsDemo, team, socials, collage };
}

