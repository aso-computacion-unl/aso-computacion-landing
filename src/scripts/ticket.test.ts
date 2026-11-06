import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeTicket, relayout } from './ticket';

// A ticket's markup reduced to what closeTicket touches: the tests run in Node, without a browser.
function element() {
	const attributes: Record<string, string> = {};
	const classes = new Set<string>();
	return {
		attributes,
		classes,
		textContent: '',
		classList: { add: (name: string) => classes.add(name) },
		setAttribute: (name: string, value: string) => (attributes[name] = value),
		removeAttribute: (name: string) => delete attributes[name],
	};
}

function ticket() {
	const state = element();
	const body = element();
	const action = element();
	action.attributes.href = '/inscribirse';
	action.attributes.target = '_blank';
	action.attributes.rel = 'noopener';
	const extra = element();
	const root = {
		querySelector: (selector: string) =>
			selector === '[data-ticket-state]' ? state : selector === '.tk' ? body : null,
		querySelectorAll: (selector: string) =>
			selector === '[data-reg-action]' ? [action] : selector === '[data-reg-extra]' ? [extra] : [],
	};
	return { root: root as unknown as HTMLElement, state, body, action, extra };
}

describe('closeTicket', () => {
	const dispatched: Event[] = [];
	vi.stubGlobal(
		'Event',
		class FakeEvent {
			constructor(public type: string) {}
		},
	);
	vi.stubGlobal('window', { dispatchEvent: (event: Event) => dispatched.push(event) });
	afterEach(() => (dispatched.length = 0));

	it('writes the reason, marks the ticket closed and hides the extras', () => {
		const { root, state, body, extra } = ticket();
		state.attributes.hidden = '';
		closeTicket(root, 'Cerrado');
		expect(state.textContent).toBe('Cerrado');
		expect('hidden' in state.attributes).toBe(false);
		expect(body.classes.has('is-closed')).toBe(true);
		expect(extra.attributes.hidden).toBe('');
	});

	it('turns the action link into disabled plain text', () => {
		const { root, action } = ticket();
		closeTicket(root, 'Cerrado');
		expect(action.classes.has('is-disabled')).toBe(true);
		expect(action.attributes).toEqual({ 'aria-disabled': 'true' });
	});

	it('tells the motion script to measure again', () => {
		closeTicket(ticket().root, 'Cerrado');
		expect(dispatched.map((event) => (event as unknown as { type: string }).type)).toEqual(['aso:relayout']);
		relayout();
		expect(dispatched).toHaveLength(2);
	});
});
