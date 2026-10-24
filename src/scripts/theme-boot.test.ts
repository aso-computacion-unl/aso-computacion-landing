import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveTheme, THEME_COLOR, THEME_KEY } from './theme';

// Layout.astro inlines a copy of resolveTheme so the theme is set before the first paint, without loading a
// module. This runs that inline script against every input and checks it still follows resolveTheme.
const layout = readFileSync(new URL('../layouts/Layout.astro', import.meta.url), 'utf8');
const bootScript = [...layout.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)]
	.map((match) => match[1])
	.find((body) => body.includes('localStorage.getItem'));

function runBoot(stored: string | null, prefersLight: boolean, storageThrows = false) {
	const keys: string[] = [];
	const meta = { content: THEME_COLOR.dark, setAttribute: (_: string, value: string) => (meta.content = value) };
	const document = { documentElement: { dataset: {} as Record<string, string> }, querySelector: () => meta };
	const localStorage = {
		getItem: (key: string) => {
			if (storageThrows) throw new Error('blocked');
			keys.push(key);
			return stored;
		},
	};
	const window = { matchMedia: (query: string) => ({ matches: prefersLight && query === '(prefers-color-scheme: light)' }) };
	new Function('document', 'window', 'localStorage', bootScript!)(document, window, localStorage);
	return { theme: document.documentElement.dataset.theme, themeColor: meta.content, keys };
}

describe('inline theme boot script', () => {
	it('is present in Layout.astro', () => {
		expect(bootScript).toBeDefined();
	});

	it('picks the same theme as resolveTheme for every stored value and system preference', () => {
		for (const stored of [null, 'light', 'dark', 'sepia']) {
			for (const prefersLight of [true, false]) {
				expect(runBoot(stored, prefersLight).theme, `${stored} / ${prefersLight}`).toBe(resolveTheme(stored, prefersLight));
			}
		}
	});

	it('reads the same storage key as the toggle', () => {
		expect(runBoot(null, false).keys).toEqual([THEME_KEY]);
	});

	it('follows the system when storage is blocked', () => {
		expect(runBoot(null, true, true).theme).toBe('light');
		expect(runBoot(null, false, true).theme).toBe('dark');
	});

	it('sets the light browser chrome colour only for the light theme', () => {
		expect(runBoot('light', false).themeColor).toBe(THEME_COLOR.light);
		expect(runBoot('dark', true).themeColor).toBe(THEME_COLOR.dark);
	});
});
