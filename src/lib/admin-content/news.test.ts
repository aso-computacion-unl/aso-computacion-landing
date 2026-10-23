import { describe, expect, it } from 'vitest';
import { HOME_NEWS_COUNT, latestNews, newsPath, toNews } from './news';
import { newsItem } from './test-fixtures';

const ctx = { today: '2026-10-22', resolveLocal: () => undefined };
const item = (slug: string, publishedAt: string, overrides = {}) => newsItem({ slug, publishedAt, title: slug, ...overrides });

describe('toNews', () => {
	it('orders by publishedAt, newest first, whatever order the payload has', () => {
		const news = toNews([item('b', '2026-03-01'), item('d', '2026-10-20'), item('a', '2025-12-31'), item('c', '2026-05-09')], ctx);
		expect(news.map((entry) => entry.slug)).toEqual(['d', 'c', 'b', 'a']);
	});

	it('keeps the payload order for items published the same day', () => {
		const news = toNews([item('x', '2026-05-09'), item('y', '2026-05-09'), item('z', '2026-05-09')], ctx);
		expect(news.map((entry) => entry.slug)).toEqual(['x', 'y', 'z']);
	});

	it('does not mutate its input', () => {
		const input = [item('old', '2020-01-01'), item('new', '2026-01-01')];
		toNews(input, ctx);
		expect(input.map((entry) => entry.slug)).toEqual(['old', 'new']);
	});

	it('maps an item to what the pages render', () => {
		const [entry] = toNews([newsItem()], ctx);
		expect(entry).toEqual({
			slug: 'taller-de-git-2026',
			href: '/novedades/taller-de-git-2026',
			title: 'Taller de Git 2026',
			summary: 'Abrimos inscripciones para el taller de Git.',
			body: 'Primer párrafo con **negrita**.\n\n- Uno\n- Dos',
			date: '2026-10-20',
			stamp: '20 oct 2026',
			cover: { src: 'https://res.cloudinary.com/demo/image/upload/v1/aso/news.jpg', width: 1200, height: 800, alt: 'Cartel del taller' },
		});
	});

	it('omits the cover when there is none', () => {
		const [entry] = toNews([newsItem({ cover: null })], ctx);
		expect(entry).not.toHaveProperty('cover');
	});

	it('builds the page path from the slug', () => {
		expect(newsPath('hola-mundo')).toBe('/novedades/hola-mundo');
	});
});

describe('latestNews', () => {
	const many = (count: number) => toNews(Array.from({ length: count }, (_, index) => item(`n${index}`, `2026-0${index + 1}-10`)), ctx);

	it('shows the three newest of a longer list', () => {
		expect(HOME_NEWS_COUNT).toBe(3);
		expect(latestNews(many(4)).map((entry) => entry.slug)).toEqual(['n3', 'n2', 'n1']);
	});

	it('shows all of a short list, and nothing for an empty one', () => {
		expect(latestNews(many(2))).toHaveLength(2);
		expect(latestNews(many(1))).toHaveLength(1);
		expect(latestNews([])).toEqual([]);
	});
});
