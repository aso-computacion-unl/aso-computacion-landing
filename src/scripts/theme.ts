// Light/dark theme. The inline script in Layout.astro applies the theme before the first paint (same rule as
// resolveTheme, kept tiny on purpose); this module only wires the header toggle.
export type Theme = 'light' | 'dark';

export const THEME_KEY = 'aso-theme';

// A stored choice wins; otherwise follow the system, defaulting to the dark brand look unless it asks for light.
export function resolveTheme(stored: string | null, prefersLight: boolean): Theme {
	if (stored === 'light' || stored === 'dark') return stored;
	return prefersLight ? 'light' : 'dark';
}

export function nextTheme(theme: Theme): Theme {
	return theme === 'dark' ? 'light' : 'dark';
}

// Browser chrome colour per theme: the page background.
const THEME_COLOR: Record<Theme, string> = { dark: '#053066', light: '#f4f7fb' };

function apply(theme: Theme) {
	const root = document.documentElement;
	root.dataset.theme = theme;
	document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
	for (const button of document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]')) {
		button.setAttribute('aria-pressed', String(theme === 'dark'));
	}
}

export function initThemeToggle() {
	const current = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
	apply(current());
	for (const button of document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]')) {
		button.addEventListener('click', () => {
			const theme = nextTheme(current());
			try {
				localStorage.setItem(THEME_KEY, theme);
			} catch {
				// Storage blocked (private mode): the choice lasts for this page only.
			}
			apply(theme);
		});
	}
}
