import { describe, expect, it } from 'vitest';
import { ALL, countThreads, matchesCategory, nextTabIndex } from './forum-tabs';

describe('matchesCategory', () => {
	it('shows every thread on the all tab', () => {
		expect(matchesCategory('materias', ALL)).toBe(true);
		expect(matchesCategory('', ALL)).toBe(true);
	});

	it('shows only the threads of the chosen category otherwise', () => {
		expect(matchesCategory('materias', 'materias')).toBe(true);
		expect(matchesCategory('general', 'materias')).toBe(false);
	});
});

describe('countThreads', () => {
	const categories = ['materias', 'materias', 'propuestas', 'general', 'general', 'general'];

	it('counts every thread for all and the matching ones for a category', () => {
		expect(countThreads(categories, ALL)).toBe(6);
		expect(countThreads(categories, 'general')).toBe(3);
		expect(countThreads(categories, 'materias')).toBe(2);
		expect(countThreads(categories, 'propuestas')).toBe(1);
	});

	it('is zero for a category without threads', () => {
		expect(countThreads(categories, 'otra')).toBe(0);
		expect(countThreads([], ALL)).toBe(0);
	});
});

describe('nextTabIndex', () => {
	it('moves with the arrows and wraps at both ends', () => {
		expect(nextTabIndex('ArrowRight', 0, 4)).toBe(1);
		expect(nextTabIndex('ArrowRight', 3, 4)).toBe(0);
		expect(nextTabIndex('ArrowLeft', 2, 4)).toBe(1);
		expect(nextTabIndex('ArrowLeft', 0, 4)).toBe(3);
	});

	it('treats down and up like right and left', () => {
		expect(nextTabIndex('ArrowDown', 1, 4)).toBe(2);
		expect(nextTabIndex('ArrowUp', 1, 4)).toBe(0);
	});

	it('jumps to the first and last tab with Home and End', () => {
		expect(nextTabIndex('Home', 2, 4)).toBe(0);
		expect(nextTabIndex('End', 1, 4)).toBe(3);
	});

	it('leaves any other key alone, and an empty tab list', () => {
		expect(nextTabIndex('Enter', 1, 4)).toBeNull();
		expect(nextTabIndex('a', 1, 4)).toBeNull();
		expect(nextTabIndex('ArrowRight', 0, 0)).toBeNull();
	});
});
