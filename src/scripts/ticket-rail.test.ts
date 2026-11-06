import { describe, expect, it } from 'vitest';
import { RAIL_MIN, padCount, railState, shouldRail } from './ticket-rail';

// Three columns of 300px with a 28px gap: one step is 328px and the viewport shows three of them.
const base = { count: 6, step: 328, clientWidth: 956, scrollWidth: 1940 };

describe('shouldRail', () => {
	it('keeps up to three tickets as the grid and turns more into a rail', () => {
		expect(RAIL_MIN).toBe(4);
		expect(shouldRail(0)).toBe(false);
		expect(shouldRail(3)).toBe(false);
		expect(shouldRail(4)).toBe(true);
		expect(shouldRail(12)).toBe(true);
	});
});

describe('padCount', () => {
	it('pads to two digits', () => {
		expect(padCount(1)).toBe('01');
		expect(padCount(12)).toBe('12');
		expect(padCount(123)).toBe('123');
	});
});

describe('railState', () => {
	it('starts on the first page: 01–03 of 06, back disabled', () => {
		const state = railState({ ...base, scrollLeft: 0 });
		expect(state).toMatchObject({ from: 1, to: 3, total: 6, atStart: true, atEnd: false });
		expect(state.progress).toBeCloseTo(0.5);
	});

	it('follows the scroll by whole tickets', () => {
		const state = railState({ ...base, scrollLeft: 328 });
		expect(state).toMatchObject({ from: 2, to: 4, atStart: false, atEnd: false });
	});

	it('ends on the last ticket: 04–06 of 06, next disabled, bar full', () => {
		const state = railState({ ...base, scrollLeft: 984 });
		expect(state).toMatchObject({ from: 4, to: 6, total: 6, atStart: false, atEnd: true, progress: 1 });
	});

	it('shows one ticket at a time on a narrow screen and never goes past the total', () => {
		const phone = { count: 5, step: 330, clientWidth: 300, scrollWidth: 1650 };
		expect(railState({ ...phone, scrollLeft: 0 })).toMatchObject({ from: 1, to: 1 });
		expect(railState({ ...phone, scrollLeft: 1350 })).toMatchObject({ from: 5, to: 5, atEnd: true });
		expect(railState({ ...phone, scrollLeft: 99_999 }).to).toBe(5);
	});

	it('tolerates a rail that has not been measured yet', () => {
		const state = railState({ count: 4, step: 0, clientWidth: 0, scrollWidth: 0, scrollLeft: 0 });
		expect(state).toMatchObject({ from: 1, to: 1, total: 4, atStart: true });
		expect(Number.isFinite(state.progress)).toBe(true);
	});
});
