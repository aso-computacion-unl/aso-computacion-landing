// Items of the diagonal ribbon: the next three activities (the nearest one first, each with its date and how to get in),
// then the two ways to keep up, the forum and Instagram. Built from the same tickets as the Inscripciones section.
import type { Locale } from '../../i18n/locales';
import { useTranslations } from '../../i18n/ui';
import type { Ticket } from './tickets';

const RIBBON_ACTIVITIES = 3;

// "12 nov"; a month-only activity says just "nov": its date is the first of the month for ordering, not a real day.
const shortDate = (date: string, locale: Locale, monthOnly: boolean): string =>
	new Intl.DateTimeFormat(locale, { ...(monthOnly ? {} : { day: 'numeric' }), month: 'short', timeZone: 'UTC' }).format(
		new Date(date),
	);

export function ribbonItems(tickets: readonly Ticket[], locale: Locale): string[] {
	const t = useTranslations(locale);
	// A demo activity carries a "demo" tag on its ticket; the band has no room for one, so it never names it.
	const real = tickets.filter(({ entry }) => !entry.demo);
	const activities = real.slice(0, RIBBON_ACTIVITIES).map(({ entry, mode }, index) => {
		const parts = [entry.title, entry.date && shortDate(entry.date, locale, entry.datePrecision === 'month')].filter(
			Boolean,
		);
		if (index === 0) return t('ribbon.next', { item: parts.join(' · ') });
		// "cupos limitados" only when the admin set a capacity; without one nothing is said about seats.
		const access = mode === 'free' ? t('ribbon.free') : entry.registration?.capacity ? t('ribbon.seats') : undefined;
		return [...parts, access].filter(Boolean).join(' · ');
	});
	return [...activities, t('ribbon.forum'), t('ribbon.instagram')];
}

// The band is about 1.2 viewports wide and its track slides one group to the left, so one group has to cover it: a short
// list (few activities, or none) is repeated whole until it has enough text for a 2560px screen.
const RIBBON_MIN_CHARS = 260;

export function ribbonLoop(items: readonly string[]): string[] {
	if (items.length === 0) return [];
	const loop = [...items];
	while (loop.join('').length < RIBBON_MIN_CHARS) loop.push(...items);
	return loop;
}
