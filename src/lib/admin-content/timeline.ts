// Events -> timeline entries. The kind of an entry comes from its date, never from a stored flag.
import type { TimelineEntry, TimelineKind } from './model';
import { slugify, toPhoto, type MapContext } from './map';
import type { PublicEvent } from './types';

const TIME_ZONE = 'America/Guayaquil';

export const todayInEcuador = (now: Date): string =>
	new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// "2026-04-14" -> "14 abr 2026" (the chip format the landing has always used).
export const formatStamp = (date: string): string => {
	const [year, month, day] = date.split('-').map(Number);
	return `${day} ${MONTHS[month - 1]} ${year}`;
};

// upcoming: dated today or later. merge: a past event that lists highlights (drawn as a feature branch).
// commit: everything else, including undated events (the API puts those last).
export const eventKind = (event: PublicEvent, today: string): TimelineKind => {
	if (event.date !== null && event.date >= today) return 'upcoming';
	return event.highlights.length > 0 ? 'merge' : 'commit';
};

// `git log` order: newest first, undated last. Stable, so ties keep the API order.
export const sortEvents = <T extends { date?: string | null }>(events: readonly T[]): T[] =>
	[...events].sort((a, b) => {
		if (!a.date && !b.date) return 0;
		if (!a.date) return 1;
		if (!b.date) return -1;
		return b.date.localeCompare(a.date);
	});

const branchIds = (highlights: readonly string[]) => {
	const seen = new Map<string, number>();
	return highlights.map((title, index) => {
		const base = slugify(title).slice(0, 48).replace(/-+$/, '') || `item-${index + 1}`;
		const count = (seen.get(base) ?? 0) + 1;
		seen.set(base, count);
		return { id: count === 1 ? base : `${base}-${count}`, title };
	});
};

export const toTimelineEntry = (event: PublicEvent, ctx: MapContext): TimelineEntry => {
	const kind = eventKind(event, ctx.today);
	const photos = event.photos.map((photo) => toPhoto(photo, ctx));
	const meta = {
		...(event.hora ? { hora: event.hora } : {}),
		...(event.lugar ? { lugar: event.lugar } : {}),
		...(event.para ? { para: event.para } : {}),
	};
	return {
		id: event.slug,
		kind,
		title: event.title,
		featured: event.featured,
		...(event.date ? { stamp: formatStamp(event.date), date: event.date } : {}),
		...(event.description ? { description: event.description } : {}),
		...(event.type ? { type: event.type } : {}),
		...(event.commitMessage ? { msg: event.commitMessage } : {}),
		...(Object.keys(meta).length > 0 ? { meta } : {}),
		...(kind === 'merge' ? { branch: { name: event.slug, commits: branchIds(event.highlights) } } : {}),
		...(photos.length > 0 ? { image: photos[0], gallery: photos } : {}),
		...(event.linkUrl ? { href: event.linkUrl, hrefLabel: event.linkLabel || 'Más información' } : {}),
	};
};
