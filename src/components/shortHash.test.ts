import { describe, expect, it } from 'vitest';
import { shortHash } from './shortHash';

describe('shortHash', () => {
	it('is seven hex characters', () => {
		expect(shortHash('hackaton-2026')).toMatch(/^[0-9a-f]{7}$/);
	});

	it('is stable for one slug and differs between slugs', () => {
		expect(shortHash('feria')).toBe(shortHash('feria'));
		expect(shortHash('feria')).not.toBe(shortHash('hackaton'));
	});

	it('is the start of the SHA-1 of the slug', () => {
		// echo -n abc | sha1sum → a9993e364706816aba3e25717850c26c9cd0d89d
		expect(shortHash('abc')).toBe('a9993e3');
	});
});
