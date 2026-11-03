import { describe, expect, it } from 'vitest';
import { GLYPHS, revealTimes } from './decrypt';

// A deterministic stand-in for Math.random.
const sequence = (values: number[]) => {
	let index = 0;
	return () => values[index++ % values.length];
};

describe('revealTimes', () => {
	it('gives every character its moment, later for later characters, after a short beat', () => {
		const times = revealTimes(5, () => 0);
		expect(times).toEqual([320, 382, 444, 506, 568]);
	});

	it('adds up to 80 ms of jitter per character, so neighbours may swap and the word resolves unevenly', () => {
		const times = revealTimes(3, sequence([0.5, 1, 0]));
		expect(times).toEqual([360, 462, 444]);
	});

	it('is empty for an empty word', () => {
		expect(revealTimes(0, Math.random)).toEqual([]);
	});
});

describe('GLYPHS', () => {
	it('are symbols only: no letter that could read as a word while the title is still scrambled', () => {
		expect(GLYPHS).not.toMatch(/[a-zA-Z]/);
	});
});
