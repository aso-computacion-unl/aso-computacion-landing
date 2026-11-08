import { toLocale } from '../i18n/locales';
import { useTranslations, type Translate } from '../i18n/ui';
import { fetchSeats, seatView, type Seat } from '../lib/registration/seats';
import { closeTicket, relayout } from './ticket';

// Live seats (S5), loaded only when the page knows the admin's origin (`data-seats-url` on the Inscripciones section).
// One request at page load. If it fails or is slow nothing changes: the tickets keep the capacity they were built with
// and their action, and the server stays the authority when someone submits.

const t = useTranslations(toLocale(document.documentElement.lang));

function paint(ticket: HTMLElement, seat: Seat, translate: Translate) {
	const view = seatView(seat);
	if (view.total !== undefined && view.free !== undefined && view.taken !== undefined && view.percent !== undefined) {
		const number = ticket.querySelector<HTMLElement>('[data-seat-num]');
		const label = ticket.querySelector<HTMLElement>('[data-seat-label]');
		const meter = ticket.querySelector<HTMLElement>('[data-seat-meter]');
		const live = ticket.querySelector<HTMLElement>('[data-seat-live]');
		if (number) number.textContent = String(view.free);
		if (label)
			label.textContent = translate(view.free === 1 ? 'ticket.seatLeftOne' : 'ticket.seatsLeft', { total: view.total });
		if (meter) {
			meter.setAttribute('aria-label', translate('ticket.meter', { taken: view.taken, total: view.total }));
			meter.querySelector('i')?.style.setProperty('width', `${view.percent}%`);
			meter.setAttribute('data-seat-shown', '');
		}
		// The numbers come from the admin now, not from the build: say so.
		live?.removeAttribute('hidden');
	}
	if (view.state === 'full') closeTicket(ticket, translate('ticket.full'));
	else if (view.state === 'closed') closeTicket(ticket, translate('ticket.closed'));
	else relayout();
}

async function showSeats() {
	const section = document.querySelector<HTMLElement>('[data-seats-url]');
	const url = section?.dataset.seatsUrl;
	const seats = url ? await fetchSeats(url) : undefined;
	// Answered or not, the places held for the meter are either filled or given back.
	section?.setAttribute('data-seats-settled', '');
	if (!seats) return relayout();
	document.querySelectorAll<HTMLElement>('[data-ticket]').forEach((ticket) => {
		const seat = ticket.dataset.ticket ? seats.get(ticket.dataset.ticket) : undefined;
		if (seat) paint(ticket, seat, t);
	});
}

void showSeats();
