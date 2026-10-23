import { describe, expect, it } from 'vitest';
import { navRouting } from './nav';

describe('navRouting', () => {
	it('keeps section anchors in-page on the home page of each locale', () => {
		expect(navRouting('/', 'es').hrefFor('#actividades')).toBe('#actividades');
		expect(navRouting('/en/', 'en').hrefFor('#actividades')).toBe('#actividades');
		expect(navRouting('/en', 'en').hrefFor('#actividades')).toBe('#actividades');
	});

	it('points section anchors back to the home page of the same locale from other pages', () => {
		expect(navRouting('/novedades/', 'es').hrefFor('#faq')).toBe('/#faq');
		expect(navRouting('/en/novedades/', 'en').hrefFor('#faq')).toBe('/en/#faq');
	});

	it('localizes page links', () => {
		expect(navRouting('/', 'es').hrefFor('/novedades')).toBe('/novedades');
		expect(navRouting('/en/', 'en').hrefFor('/novedades')).toBe('/en/novedades');
	});

	it('marks a page link current on that page and its children, never an anchor', () => {
		const en = navRouting('/en/novedades/estrenamos-sitio-web/', 'en');
		expect(en.isCurrent('/novedades')).toBe(true);
		expect(en.isCurrent('#faq')).toBe(false);
		expect(navRouting('/novedades/', 'es').isCurrent('/novedades')).toBe(true);
		expect(navRouting('/', 'es').isCurrent('/novedades')).toBe(false);
		expect(navRouting('/novedades-viejas/', 'es').isCurrent('/novedades')).toBe(false);
	});

	it('exposes the home path and whether the page is home', () => {
		expect(navRouting('/en/', 'en')).toMatchObject({ homePath: '/en/', onHome: true });
		expect(navRouting('/novedades/', 'es')).toMatchObject({ homePath: '/', onHome: false });
	});
});
