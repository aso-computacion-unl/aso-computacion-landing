import { describe, expect, it } from 'vitest';
import type { NewsItem } from '../admin-content/model';
import { newsFeedPath, toRssItems } from './rss';

const site = new URL('https://example.test');

const item = (overrides: Partial<NewsItem> = {}): NewsItem => ({
	slug: 'torneo',
	href: '/novedades/torneo',
	title: 'Resultados del torneo',
	summary: 'Quién ganó y cómo.',
	body: 'Cuerpo',
	date: '2026-10-20',
	stamp: '20 oct 2026',
	...overrides,
});

describe('toRssItems', () => {
	it('maps a post to a feed item with an absolute link and a UTC date', () => {
		expect(toRssItems([item()], site)).toEqual([
			{
				title: 'Resultados del torneo',
				description: 'Quién ganó y cómo.',
				link: 'https://example.test/novedades/torneo/',
				pubDate: new Date('2026-10-20T00:00:00Z'),
			},
		]);
	});

	it('links English posts under /en and keeps the order it was given', () => {
		const items = toRssItems(
			[
				item({ slug: 'b', href: '/en/novedades/b', date: '2026-10-22' }),
				item({ slug: 'a', href: '/novedades/a', date: '2026-10-01' }),
			],
			site,
		);
		expect(items.map((entry) => entry.link)).toEqual([
			'https://example.test/en/novedades/b/',
			'https://example.test/novedades/a/',
		]);
	});

	it('is empty for no news', () => {
		expect(toRssItems([], site)).toEqual([]);
	});
});

describe('newsFeedPath', () => {
	it('lives next to the news index of each language', () => {
		expect(newsFeedPath('es')).toBe('/novedades/rss.xml');
		expect(newsFeedPath('en')).toBe('/en/novedades/rss.xml');
	});
});
