// What both ticket scripts do to a ticket that stopped taking registrations: its deadline passed in the visitor's clock
// (ticket-deadline.ts) or the admin says it is full or closed (seats.ts). The state is written once and says why; the
// action stays on the ticket but cannot be used.

// The layout below a ticket that changes height moves; the motion script re-measures when told.
export const relayout = () => window.dispatchEvent(new Event('aso:relayout'));

// The action is a link and a link has no `disabled`: without its href it is plain text, and aria-disabled says so.
function disableAction(action: HTMLElement) {
	action.classList.add('is-disabled');
	action.removeAttribute('href');
	action.removeAttribute('target');
	action.removeAttribute('rel');
	action.setAttribute('aria-disabled', 'true');
}

export function closeTicket(ticket: HTMLElement, message: string) {
	const state = ticket.querySelector<HTMLElement>('[data-ticket-state]');
	if (state) {
		state.textContent = message;
		state.removeAttribute('hidden');
	}
	ticket.querySelectorAll<HTMLElement>('[data-reg-action]').forEach(disableAction);
	ticket.querySelectorAll<HTMLElement>('[data-reg-extra]').forEach((extra) => extra.setAttribute('hidden', ''));
	relayout();
}
