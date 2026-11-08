import type { Locale } from '../../i18n/locales';
import type { UiKey } from '../../i18n/ui';
import type { TimelineEntry } from '../admin-content/model';
import { registrationClosed } from './rules';

// Which upcoming activities get a ticket in the "Inscripciones" section, in what order, and how each one signs up.
// Pure: Registrations.astro renders what this returns. The seats left are not known (the site is static), so a
// ticket only ever shows the capacity.

// unl: the admin's event page, with the student's UNL account. open: the same page, with the open form. free: no
// registration (the calendar link, if any).
export type TicketMode = 'unl' | 'open' | 'free';

export interface Ticket {
	entry: TimelineEntry;
	mode: TicketMode;
	// "Boleto 00N", in the order shown; a free pass is numbered like the rest.
	number: number;
}

// The ticket's id on the home page. Prefixed so an activity called "faq" never takes the id of a section.
export const ticketAnchor = (slug: string): string => `inscripciones-${slug}`;

export const ticketMode = (entry: TimelineEntry): TicketMode => entry.registration?.mode ?? 'free';

// Nearest date first (what is coming up soonest), undated last; ties keep the timeline's order.
const byDate = (a: TimelineEntry, b: TimelineEntry): number => {
	if (a.date === b.date) return 0;
	if (!a.date) return 1;
	if (!b.date) return -1;
	return a.date.localeCompare(b.date);
};

export function chooseTickets(entries: readonly TimelineEntry[]): Ticket[] {
	return entries
		.filter((entry) => entry.kind === 'upcoming')
		.sort(byDate)
		.map((entry, index): Ticket => ({ entry, mode: ticketMode(entry), number: index + 1 }));
}

// What the date stub of a ticket prints: the big numeral, a caption and, when the day is known, its weekday for the
// body. The stamp is "14 abr 2026"; a month-only one ("abr 2026") has no day, so the month takes the numeral's place.
export interface TicketDate {
	day: string;
	month: string;
	year?: string;
	weekday?: string;
}

export function ticketDate(entry: TimelineEntry, locale: Locale): TicketDate | undefined {
	if (!entry.stamp) return undefined;
	const [day, month = '', ...year] = entry.stamp.split(' ');
	const parts: TicketDate = { day, month, ...(year.length > 0 ? { year: year.join(' ') } : {}) };
	if (entry.datePrecision === 'month' || !entry.date) return parts;
	// The calendar day as the admin wrote it, so the weekday does not move with the visitor's time zone.
	const at = new Date(`${entry.date}T00:00:00Z`);
	if (Number.isNaN(at.getTime())) return parts;
	const weekday = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-EC', { weekday: 'short', timeZone: 'UTC' })
		.format(at)
		.replace('.', '');
	return { ...parts, weekday };
}

const DAY = 86_400_000;

// Whole days left until the deadline ("Cierra en 14 días"); 0 in its last 24 hours. Nothing when there is no deadline,
// it cannot be read or it already passed (the admin closes from that instant on, see registrationClosed).
export function closesIn(deadline: string | undefined, now: number): { days: number } | undefined {
	if (deadline === undefined || registrationClosed(deadline, now)) return undefined;
	const instant = Date.parse(deadline);
	if (Number.isNaN(instant)) return undefined;
	return { days: Math.floor((instant - now) / DAY) };
}

// The words for the days left, in the i18n dictionary's keys: "Cierra en 14 días", "Cierra en 1 día", "Cierra en menos de un día".
export function closesInLabel(days: number): { key: UiKey; vars?: { days: number } } {
	if (days === 0) return { key: 'ticket.closesSoon' };
	if (days === 1) return { key: 'ticket.closesInOne' };
	return { key: 'ticket.closesIn', vars: { days } };
}
