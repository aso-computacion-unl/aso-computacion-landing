import { describe, expect, it } from 'vitest';
import { ALL, categoryCounts, nextFrame, visibleThreads, type TypeState } from './forum-window';

const kinds = ['materias', 'materias', 'propuestas'];

describe('categoryCounts', () => {
	it('counts every thread under "all" and each category apart, zero included', () => {
		expect(categoryCounts(kinds, ['general', 'materias', 'propuestas'])).toEqual({
			[ALL]: 3,
			general: 0,
			materias: 2,
			propuestas: 1,
		});
	});

	it('has no threads at all without failing', () => {
		expect(categoryCounts([], ['general'])).toEqual({ [ALL]: 0, general: 0 });
	});
});

describe('visibleThreads', () => {
	it('shows everything for "all"', () => {
		expect(visibleThreads(kinds, ALL)).toEqual([true, true, true]);
	});

	it('shows only the threads of the chosen category, keeping their order', () => {
		expect(visibleThreads(kinds, 'materias')).toEqual([true, true, false]);
		expect(visibleThreads(kinds, 'propuestas')).toEqual([false, false, true]);
		expect(visibleThreads(kinds, 'general')).toEqual([false, false, false]);
	});
});

describe('nextFrame', () => {
	const lines = ['abc', 'xy'];
	const start: TypeState = { line: 0, chars: 0, deleting: false };

	it('types one character at a time', () => {
		const first = nextFrame(start, lines);
		expect(first.state).toEqual({ line: 0, chars: 1, deleting: false });
		expect(first.text).toBe('');
		expect(nextFrame(first.state, lines).text).toBe('a');
	});

	it('holds the finished line, then deletes it faster than it was typed', () => {
		const typed = nextFrame({ line: 0, chars: 3, deleting: false }, lines);
		expect(typed.text).toBe('abc');
		expect(typed.state.deleting).toBe(true);
		expect(typed.delay).toBeGreaterThan(1000);

		const erasing = nextFrame(typed.state, lines);
		expect(erasing.state.chars).toBe(1);
		expect(erasing.delay).toBeLessThan(nextFrame(start, lines).delay);
	});

	it('moves on to the next line, and wraps around after the last', () => {
		expect(nextFrame({ line: 0, chars: 0, deleting: true }, lines).state).toEqual({
			line: 1,
			chars: 0,
			deleting: false,
		});
		expect(nextFrame({ line: 1, chars: 0, deleting: true }, lines).state.line).toBe(0);
	});

	it('never deletes below zero characters', () => {
		expect(nextFrame({ line: 0, chars: 1, deleting: true }, lines).state.chars).toBe(0);
	});
});
