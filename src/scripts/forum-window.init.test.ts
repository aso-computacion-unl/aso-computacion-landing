import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initFilters, initTyping } from './forum-window';

// The forum window's wiring against minimal stand-ins for the DOM it touches: the tests run in Node, without a browser.

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

function chip(kind: string) {
	const attributes: Record<string, string> = {};
	return {
		...listening(),
		dataset: { forumChip: kind },
		attributes,
		setAttribute(name: string, value: string) {
			attributes[name] = value;
		},
	};
}

describe('initFilters', () => {
	function forum() {
		const chips = [chip('all'), chip('materias'), chip('propuestas')];
		const rows = ['materias', 'general', 'materias', 'propuestas'].map((kind) => ({
			dataset: { forumRow: kind },
			hidden: false,
		}));
		const status = { dataset: { template: '{count} de {total} hilos' }, textContent: '' };
		const app = {
			querySelectorAll: (selector: string) =>
				({ '[data-forum-chip]': chips, '[data-forum-row]': rows })[selector] ?? [],
			querySelector: (selector: string) => (selector === '[data-forum-status]' ? status : null),
		};
		initFilters(app as unknown as HTMLElement);
		return { chips, rows, status };
	}

	it('shows only the chosen category, presses its chip alone and announces the count', () => {
		const { chips, rows, status } = forum();
		chips[1].fire('click');
		expect(chips.map((c) => c.attributes['aria-pressed'])).toEqual(['false', 'true', 'false']);
		expect(rows.map((row) => row.hidden)).toEqual([false, true, false, true]);
		expect(status.textContent).toBe('2 de 4 hilos');
	});

	it('brings every thread back with "all"', () => {
		const { chips, rows, status } = forum();
		chips[2].fire('click');
		chips[0].fire('click');
		expect(chips.map((c) => c.attributes['aria-pressed'])).toEqual(['true', 'false', 'false']);
		expect(rows.every((row) => !row.hidden)).toBe(true);
		expect(status.textContent).toBe('4 de 4 hilos');
	});
});

describe('initTyping', () => {
	let doc: ReturnType<typeof listening> & { hidden: boolean };
	let onIntersect: ((entries: { isIntersecting: boolean }[]) => void) | null;

	beforeEach(() => {
		vi.useFakeTimers();
		onIntersect = null;
		doc = { ...listening(), hidden: false };
		vi.stubGlobal('document', doc);
		vi.stubGlobal('window', { setTimeout, clearTimeout });
		vi.stubGlobal(
			'IntersectionObserver',
			class {
				constructor(callback: typeof onIntersect) {
					onIntersect = callback;
				}
				observe() {}
			},
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	function composer(prompts: string) {
		const target = { textContent: 'ab' };
		const app = {
			dataset: { forumPrompts: prompts },
			querySelector: (selector: string) => (selector === '[data-forum-typed]' ? target : null),
		};
		initTyping(app as unknown as HTMLElement);
		return target;
	}

	it('types nothing until the window is on screen', () => {
		const target = composer('["ab","cd"]');
		vi.advanceTimersByTime(5000);
		expect(target.textContent).toBe('ab');
	});

	it('holds the first prompt, erases it and types the next one once on screen', () => {
		const target = composer('["ab","cd"]');
		onIntersect?.([{ isIntersecting: true }]);
		expect(target.textContent).toBe('ab');
		// Hold 1600ms, erase 18ms, then two typing steps of 42ms.
		vi.advanceTimersByTime(1600 + 18 + 42);
		expect(target.textContent).toBe('');
		vi.advanceTimersByTime(42);
		expect(target.textContent).toBe('c');
	});

	it('stops typing while the tab is hidden or the window leaves the screen', () => {
		const target = composer('["ab","cd"]');
		onIntersect?.([{ isIntersecting: true }]);
		doc.hidden = true;
		doc.fire('visibilitychange');
		vi.advanceTimersByTime(5000);
		expect(target.textContent).toBe('ab');

		doc.hidden = false;
		doc.fire('visibilitychange');
		onIntersect?.([{ isIntersecting: false }]);
		vi.advanceTimersByTime(5000);
		expect(target.textContent).toBe('ab');
	});

	it('keeps the static prompt when the prompts are invalid or there is only one', () => {
		for (const prompts of ['not json', '{"a":1}', '["ab"]', '["ab", 3]']) {
			const target = composer(prompts);
			expect(onIntersect).toBeNull();
			expect(target.textContent).toBe('ab');
		}
	});
});
