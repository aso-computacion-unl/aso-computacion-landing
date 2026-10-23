import { describe, expect, it } from 'vitest';
import { alternatePath, localizedPath, toLocale } from './locales';

describe('toLocale', () => {
	it('keeps a known locale and falls back to Spanish', () => {
		expect(toLocale('en')).toBe('en');
		expect(toLocale('es')).toBe('es');
		expect(toLocale(undefined)).toBe('es');
		expect(toLocale('fr')).toBe('es');
	});
});

describe('localizedPath', () => {
	it('leaves Spanish paths unprefixed', () => {
		expect(localizedPath('/', 'es')).toBe('/');
		expect(localizedPath('/novedades', 'es')).toBe('/novedades');
		expect(localizedPath('/#redes', 'es')).toBe('/#redes');
	});

	it('prefixes English paths with /en', () => {
		expect(localizedPath('/', 'en')).toBe('/en/');
		expect(localizedPath('/novedades', 'en')).toBe('/en/novedades');
		expect(localizedPath('/novedades/taller-git', 'en')).toBe('/en/novedades/taller-git');
		expect(localizedPath('/#redes', 'en')).toBe('/en/#redes');
	});

	it('leaves in-page anchors and external links alone', () => {
		expect(localizedPath('#faq', 'en')).toBe('#faq');
		expect(localizedPath('https://www.instagram.com/aso_computacion/', 'en')).toBe('https://www.instagram.com/aso_computacion/');
	});
});

describe('alternatePath', () => {
	it('maps the current page to the same page in the other locale', () => {
		expect(alternatePath('/', 'en')).toBe('/en/');
		expect(alternatePath('/novedades/', 'en')).toBe('/en/novedades/');
		expect(alternatePath('/en/', 'es')).toBe('/');
		expect(alternatePath('/en', 'es')).toBe('/');
		expect(alternatePath('/en/novedades/taller-git/', 'es')).toBe('/novedades/taller-git/');
		expect(alternatePath('/en/novedades/', 'en')).toBe('/en/novedades/');
	});

	it('does not treat a Spanish path that starts with "en" as English', () => {
		expect(alternatePath('/enlaces', 'en')).toBe('/en/enlaces');
	});
});
