import type { UiKey } from '../../i18n/ui';
import type { TimelineEntry } from '../admin-content/model';
import { registrationClosed } from './rules';

// Which upcoming activities get a ticket in the "Inscripciones" section, in what order, and how each one signs up.
// Pure: Registrations.astro renders what this returns. The seats left are not known (the site is static), so a
// ticket only ever shows the capacity.

// unl: the admin's page, with the student's account. open: the landing's own form. free: no registration.
export type TicketMode = 'unl' | 'open' | 'free';

export interface Ticket {
	entry: TimelineEntry;
	mode: TicketMode;
	// "Boleto 00N": only the tickets that take a registration are numbered.
	number?: number;
}

// The ticket's id on the home page. Prefixed so an activity called "faq" never takes the id of a section.
export const ticketAnchor = (slug: string): string => `inscripciones-${slug}`;

// The open form needs the public Turnstile site key; without it the form cannot be shown. That activity gets no ticket
// at all: calling it "free" would promise an entrance that is not what the admin configured.
export function ticketMode(entry: TimelineEntry, siteKey: string | undefined): TicketMode | undefined {
	if (!entry.registration) return 'free';
	if (entry.registration.mode === 'unl') return 'unl';
	return siteKey?.trim() ? 'open' : undefined;
}

// Nearest date first (what is coming up soonest), undated last; ties keep the timeline's order.
const byDate = (a: TimelineEntry, b: TimelineEntry): number => {
	if (a.date === b.date) return 0;
	if (!a.date) return 1;
	if (!b.date) return -1;
	return a.date.localeCompare(b.date);
};

export function chooseTickets(entries: readonly TimelineEntry[], siteKey: string | undefined): Ticket[] {
	let number = 0;
	return entries
		.filter((entry) => entry.kind === 'upcoming')
		.sort(byDate)
		.flatMap((entry) => {
			const mode = ticketMode(entry, siteKey);
			if (!mode) return [];
			return [mode === 'free' ? { entry, mode } : { entry, mode, number: (number += 1) }];
		});
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
