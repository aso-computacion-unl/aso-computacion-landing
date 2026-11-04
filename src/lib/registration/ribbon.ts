// Items of the diagonal ribbon: the next three activities (the nearest one first, each with its date and how to get in),
// then the two ways to keep up, the forum and Instagram. Built from the same tickets as the Inscripciones section.
import type { Locale } from '../../i18n/locales';
import { useTranslations } from '../../i18n/ui';
import type { Ticket } from './tickets';

const RIBBON_ACTIVITIES = 3;

// "Taller de Python para primer ciclo" -> "Taller de Python": the band has room for the name, not the audience.
const shortTitle = (title: string): string => title.split(/ (?:para|y|for|and) /)[0];

// "12 nov"; a month-only activity says just "nov": its date is the first of the month for ordering, not a real day.
const shortDate = (date: string, locale: Locale, monthOnly: boolean): string =>
	new Intl.DateTimeFormat(locale, { ...(monthOnly ? {} : { day: 'numeric' }), month: 'short', timeZone: 'UTC' }).format(
		new Date(date),
	);

export function ribbonItems(tickets: readonly Ticket[], locale: Locale): string[] {
	const t = useTranslations(locale);
	const activities = tickets.slice(0, RIBBON_ACTIVITIES).map(({ entry, mode }, index) => {
		const parts = [
			shortTitle(entry.title),
			entry.date && shortDate(entry.date, locale, entry.datePrecision === 'month'),
		].filter(Boolean);
		if (index === 0) return t('ribbon.next', { item: parts.join(' · ') });
		return [...parts, t(mode === 'free' ? 'ribbon.free' : 'ribbon.seats')].join(' · ');
	});
	return [...activities, t('ribbon.forum'), t('ribbon.instagram')];
}
