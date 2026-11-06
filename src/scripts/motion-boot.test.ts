import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Layout.astro inlines the script that opts the page in to the pre-motion state (`html.motion`: the hero waits for its
// letters) and takes it back if motion never starts. This runs that script against a fake root and fake timers.
const layout = readFileSync(new URL('../layouts/Layout.astro', import.meta.url), 'utf8');
const bootScript = [...layout.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)]
	.map((match) => match[1])
	.find((body) => body.includes('motionReady'));

function runBoot(reducedMotion: boolean) {
	const classes = new Set<string>();
	const root = {
		dataset: {} as Record<string, string>,
		classList: { add: (name: string) => classes.add(name), remove: (name: string) => classes.delete(name) },
	};
	const document = { documentElement: root };
	const window = { matchMedia: (query: string) => ({ matches: reducedMotion && query.includes('reduce') }) };
	new Function('document', 'window', bootScript!)(document, window);
	return { root, classes };
}

describe('inline motion boot script', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('is present in Layout.astro', () => {
		expect(bootScript).toBeDefined();
	});

	it('opts in to the pre-motion state, and not under reduced motion', () => {
		expect([...runBoot(false).classes].sort()).toEqual(['js', 'motion']);
		expect([...runBoot(true).classes]).toEqual(['js']);
	});

	it('reveals the hero after three seconds when motion has not started', () => {
		const { classes } = runBoot(false);
		vi.advanceTimersByTime(2999);
		expect(classes.has('motion')).toBe(true);
		vi.advanceTimersByTime(1);
		expect(classes.has('motion')).toBe(false);
		expect(classes.has('js')).toBe(true);
	});

	it('leaves an intro that is running alone', () => {
		const { root, classes } = runBoot(false);
		vi.advanceTimersByTime(1500);
		root.dataset.motionReady = 'true';
		vi.advanceTimersByTime(10_000);
		expect(classes.has('motion')).toBe(true);
	});
});
