import { describe, expect, it } from 'vitest';
import { nextTheme, resolveTheme } from './theme';

describe('resolveTheme', () => {
	it('uses a stored choice over the system preference', () => {
		expect(resolveTheme('light', false)).toBe('light');
		expect(resolveTheme('dark', true)).toBe('dark');
	});

	it('follows the system when nothing valid is stored, dark unless it prefers light', () => {
		expect(resolveTheme(null, true)).toBe('light');
		expect(resolveTheme(null, false)).toBe('dark');
		expect(resolveTheme('sepia', true)).toBe('light');
	});
});

describe('nextTheme', () => {
	it('flips between the two themes', () => {
		expect(nextTheme('dark')).toBe('light');
		expect(nextTheme('light')).toBe('dark');
	});
});
