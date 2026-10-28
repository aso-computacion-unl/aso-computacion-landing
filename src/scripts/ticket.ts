// What both ticket scripts do to a ticket that stopped taking registrations: its deadline passed in the visitor's clock
// (registration.ts) or the admin says it is full or closed (seats.ts). The state is written once and says why; the
// action stays on the ticket but cannot be used, and the form is taken away.

// The layout below a ticket that changes height moves; the motion script re-measures when told.
export const relayout = () => window.dispatchEvent(new Event('aso:relayout'));

// A link has no `disabled`: without its href it is plain text, and aria-disabled says so.
function disableAction(action: HTMLElement) {
	action.classList.add('is-disabled');
	if (action instanceof HTMLButtonElement) {
		action.disabled = true;
		action.setAttribute('aria-expanded', 'false');
		return;
	}
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
	ticket.querySelector<HTMLElement>('[data-reg-panel]')?.setAttribute('hidden', '');
	ticket.classList.remove('is-open');
	relayout();
}
