import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The module runs when it is imported, against the page's tickets and the visitor's clock: stand-ins for both, fresh each time.
const NOW = Date.parse('2026-11-10T12:00:00Z');

function ticket(deadline: string | undefined) {
	const label = { textContent: 'built days ago' };
	const closed: string[] = [];
	const root = {
		dataset: { regDeadline: deadline },
		label,
		closed,
		querySelector: (selector: string) => {
			if (selector === '[data-reg-closes]') return label;
			if (selector === '[data-ticket-state]') return { textContent: '', removeAttribute: () => closed.push('state') };
			return null;
		},
		querySelectorAll: () => [],
	};
	return root;
}

async function load(tickets: ReturnType<typeof ticket>[]) {
	vi.stubGlobal('window', { dispatchEvent: vi.fn() });
	vi.stubGlobal('Event', class FakeEvent {});
	vi.stubGlobal('document', {
		documentElement: { lang: 'es' },
		querySelectorAll: (selector: string) => (selector === '[data-reg]' ? tickets : []),
	});
	await import('./ticket-deadline');
}

describe('ticket-deadline', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('counts the days left again with the visitor clock', async () => {
		const open = ticket('2026-11-24T12:00:00Z');
		await load([open]);
		expect(open.label.textContent).toBe('Cierra en 14 días');
	});

	it('says "less than a day" in the last 24 hours', async () => {
		const soon = ticket('2026-11-10T20:00:00Z');
		await load([soon]);
		expect(soon.label.textContent).toBe('Cierra en menos de un día');
	});

	it('closes a ticket whose deadline passed since the build', async () => {
		const expired = ticket('2026-11-09T12:00:00Z');
		await load([expired]);
		expect(expired.closed).toContain('state');
		expect(expired.label.textContent).toBe('built days ago');
	});

	it('leaves a ticket without a deadline alone', async () => {
		const open = ticket(undefined);
		await load([open]);
		expect(open.closed).toEqual([]);
		expect(open.label.textContent).toBe('built days ago');
	});
});
