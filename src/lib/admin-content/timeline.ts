// Events -> timeline entries. The kind of an entry comes from its date, never from a stored flag.
import type { EntryRegistration, EntrySchema, TimelineEntry, TimelineKind } from './model';
import { slugify, toPhoto, type MapContext } from './map';
import type { DatePrecision, PublicEvent, PublicEventRegistration, PublicEventStructuredData } from './types';
import type { Locale } from '../../i18n/locales';
import { adminOriginOf, eventUrl } from './forum';

const TIME_ZONE = 'America/Guayaquil';

export const todayInEcuador = (now: Date): string =>
	new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
		now,
	);

const MONTHS: Record<Locale, string[]> = {
	es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
	en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

// "2026-04-14" -> "14 abr 2026" (the chip format the landing has always used); month precision -> "abr 2026".
// English keeps the same order: "14 Apr 2026".
export const formatStamp = (date: string, precision: DatePrecision = 'day', locale: Locale = 'es'): string => {
	const [year, month, day] = date.split('-').map(Number);
	const name = MONTHS[locale][month - 1];
	return precision === 'month' ? `${name} ${year}` : `${day} ${name} ${year}`;
};

// What orders and classifies an event: its date, or the first of the month when only the month is confirmed.
const orderingDate = <T extends { date?: string | null; datePrecision?: DatePrecision }>(
	item: T,
): string | null | undefined =>
	item.date && item.datePrecision === 'month' ? `${item.date.slice(0, 7)}-01` : item.date;

// upcoming: dated today or later. merge: a past event that lists highlights (drawn as a feature branch).
// commit: everything else, including undated events (the API puts those last).
export const eventKind = (event: PublicEvent, today: string): TimelineKind => {
	const date = orderingDate(event);
	if (date && date >= today) return 'upcoming';
	return event.highlights.length > 0 ? 'merge' : 'commit';
};

// `git log` order: newest first, undated last. Stable, so ties keep the API order.
export const sortEvents = <T extends { date?: string | null; datePrecision?: DatePrecision }>(
	events: readonly T[],
): T[] =>
	[...events].sort((a, b) => {
		const [dateA, dateB] = [orderingDate(a), orderingDate(b)];
		if (!dateA && !dateB) return 0;
		if (!dateA) return 1;
		if (!dateB) return -1;
		return dateB.localeCompare(dateA);
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

// A registration the card can act on. Both modes sign up on the admin's event page; the payload's own links are only
// where that origin is read from (they were already checked to live on it), because the `open` mode sends no page URL.
const toEntryRegistration = (
	registration: PublicEventRegistration | null,
	slug: string,
): EntryRegistration | undefined => {
	if (!registration) return undefined;
	const href = eventUrl(adminOriginOf(registration.url ?? registration.endpoint ?? undefined), slug);
	if (!href) return undefined;
	return {
		mode: registration.mode,
		href,
		...(registration.capacity ? { capacity: registration.capacity } : {}),
		...(registration.deadline ? { deadline: registration.deadline } : {}),
	};
};

const toEntrySchema = (data: PublicEventStructuredData | null): EntrySchema | undefined =>
	data
		? {
				startDate: data.startDate,
				...(data.endDate ? { endDate: data.endDate } : {}),
				...(data.location ? { location: data.location } : {}),
				...(data.registrationUrl ? { registrationUrl: data.registrationUrl } : {}),
			}
		: undefined;

export const toTimelineEntry = (event: PublicEvent, ctx: MapContext): TimelineEntry => {
	const kind = eventKind(event, ctx.today);
	const photos = event.photos.map((photo) => toPhoto(photo, ctx));
	// Signing up, the calendar file and the schema values only make sense before the event is over.
	const registration = kind === 'upcoming' ? toEntryRegistration(event.registration, event.slug) : undefined;
	const schema = kind === 'upcoming' ? toEntrySchema(event.structuredData) : undefined;
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
		...(event.date
			? event.datePrecision === 'month'
				? {
						stamp: formatStamp(event.date, 'month', ctx.locale),
						date: orderingDate(event) ?? event.date,
						datePrecision: 'month' as const,
					}
				: { stamp: formatStamp(event.date, 'day', ctx.locale), date: event.date }
			: {}),
		...(event.description ? { description: event.description } : {}),
		...(event.type ? { type: event.type } : {}),
		...(event.commitMessage ? { msg: event.commitMessage } : {}),
		...(Object.keys(meta).length > 0 ? { meta } : {}),
		...(kind === 'merge' ? { branch: { name: event.slug, commits: branchIds(event.highlights) } } : {}),
		...(photos.length > 0 ? { image: photos[0], gallery: photos } : {}),
		...(event.linkUrl ? { href: event.linkUrl, hrefLabel: event.linkLabel || 'Más información' } : {}),
		...(registration ? { registration } : {}),
		...(kind === 'upcoming' && event.calendarUrl ? { calendarHref: event.calendarUrl } : {}),
		...(schema ? { schema } : {}),
	};
};
