import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initRail } from './ticket-rail';

// initRail wired to minimal stand-ins for the DOM it touches: the tests run in Node, without a browser DOM.

type Listener = () => void;

function listening() {
	const listeners: Record<string, Listener[]> = {};
	return {
		listeners,
		addEventListener(type: string, fn: Listener) {
			(listeners[type] ??= []).push(fn);
		},
		fire(type: string) {
			listeners[type]?.forEach((fn) => fn());
		},
	};
}

function button() {
	return { ...listening(), disabled: false };
}

// Tickets 300px wide with a 28px gap (one step is 328px) in a viewport that shows three.
function rail(tickets: number) {
	const items = Array.from({ length: tickets }, (_, i) => ({ offsetLeft: i * 328 }));
	const prev = button();
	const next = button();
	const count = { textContent: '' };
	const bar = { style: { setProperty: vi.fn() } };
	const ui = {
		hidden: true,
		querySelector: (selector: string) =>
			({ '[data-rail-prev]': prev, '[data-rail-next]': next, '[data-rail-count]': count, '[data-rail-bar]': bar })[
				selector
			] ?? null,
	};
	const list = {
		...listening(),
		scrollLeft: 0,
		clientWidth: 956,
		scrollWidth: tickets * 328 - 28,
		scrollBy: vi.fn(),
		querySelectorAll: (selector: string) => (selector === ':scope > .tk-item' ? items : []),
	};
	const host = {
		querySelector: (selector: string) => ({ '[data-rail]': list, '[data-rail-ui]': ui })[selector] ?? null,
	};
	return { host: host as unknown as HTMLElement, list, ui, prev, next, count, bar };
}

let reduced = false;
const observed: unknown[] = [];

beforeEach(() => {
	reduced = false;
	observed.length = 0;
	vi.stubGlobal('document', { documentElement: { lang: 'es' } });
	vi.stubGlobal('matchMedia', () => ({
		get matches() {
			return reduced;
		},
	}));
	// Paint right away instead of on the next frame.
	vi.stubGlobal('requestAnimationFrame', (fn: () => void) => {
		fn();
		return 1;
	});
	vi.stubGlobal('cancelAnimationFrame', () => {});
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe(target: unknown) {
				observed.push(target);
			}
		},
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('initRail', () => {
	it('shows the controls with the first page counted and the back arrow off', () => {
		const r = rail(6);
		initRail(r.host);
		expect(r.ui.hidden).toBe(false);
		expect(r.count.textContent).toBe('01–03 de 06');
		expect(r.bar.style.setProperty).toHaveBeenLastCalledWith('transform', 'scaleX(0.5)');
		expect(r.prev.disabled).toBe(true);
		expect(r.next.disabled).toBe(false);
		expect(observed).toEqual([r.list]);
	});

	it('moves one ticket per arrow click, smoothly unless motion is reduced', () => {
		const r = rail(6);
		initRail(r.host);
		r.next.fire('click');
		expect(r.list.scrollBy).toHaveBeenLastCalledWith({ left: 328, behavior: 'smooth' });
		reduced = true;
		r.prev.fire('click');
		expect(r.list.scrollBy).toHaveBeenLastCalledWith({ left: -328, behavior: 'auto' });
	});

	it('repaints the counter, the bar and the arrows when the strip scrolls to the end', () => {
		const r = rail(6);
		initRail(r.host);
		r.list.scrollLeft = 984;
		r.list.fire('scroll');
		expect(r.count.textContent).toBe('04–06 de 06');
		expect(r.bar.style.setProperty).toHaveBeenLastCalledWith('transform', 'scaleX(1)');
		expect(r.prev.disabled).toBe(false);
		expect(r.next.disabled).toBe(true);
	});

	it('counts in English on an English page', () => {
		vi.stubGlobal('document', { documentElement: { lang: 'en' } });
		const r = rail(4);
		initRail(r.host);
		expect(r.count.textContent).toBe('01–03 of 04');
	});

	it('leaves three tickets as the grid: controls hidden and nothing wired', () => {
		const r = rail(3);
		initRail(r.host);
		expect(r.ui.hidden).toBe(true);
		expect(r.count.textContent).toBe('');
		expect(r.list.listeners).toEqual({});
		expect(observed).toEqual([]);
	});

	it('does nothing when the rail controls are missing', () => {
		const r = rail(6);
		const host = { querySelector: (s: string) => (s === '[data-rail]' ? r.list : null) } as unknown as HTMLElement;
		initRail(host);
		expect(r.list.listeners).toEqual({});
		expect(observed).toEqual([]);
	});
});
