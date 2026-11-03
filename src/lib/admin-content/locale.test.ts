import type { ImageMetadata } from 'astro';
import { describe, expect, it } from 'vitest';
import { composeSiteContent, type Baseline } from './compose';
import { formatStamp } from './timeline';
import { image, newsItem, payload } from './test-fixtures';

const NOW = new Date('2026-10-22T15:00:00Z');
const resolveLocal = (path: string) =>
	({ src: path, width: 10, height: 10, format: 'jpg' }) as unknown as ImageMetadata;

const baseline: Baseline = {
	site: { name: 'ASO', tagline: 't', headline: ['a'], headlineAccent: 0, heroCue: 'cue', description: 'd', about: 'a' },
	navLinks: [],
	anchors: {
		next: { id: 'next', kind: 'next', stamp: 'Up next', title: 'next' },
		head: {
			id: 'head',
			kind: 'head',
			stamp: 'HEAD',
			title: 'Board',
			description: 'old',
			href: '#directiva',
			hrefLabel: 'Meet',
		},
		initial: { id: 'init', kind: 'initial', stamp: '2020', title: 'Born' },
	},
	demo: { events: [], pillars: [], faqItems: [], boardFun: {}, collage: [] },
};

const board = (count: number) =>
	Array.from({ length: count }, (_, i) => ({ name: `Member ${i}`, role: 'Vocal', photo: image({ alt: '' }) }));

const compose = (locale: 'es' | 'en' | undefined, members = 1) =>
	composeSiteContent({
		loaded: { source: 'api', content: payload({ board: board(members), news: [newsItem()] }) },
		baseline,
		now: NOW,
		resolveLocal,
		locale,
	});

describe('formatStamp per locale', () => {
	it('keeps the Spanish chip format by default', () => {
		expect(formatStamp('2026-04-14')).toBe('14 abr 2026');
		expect(formatStamp('2026-04-14', 'month')).toBe('abr 2026');
	});

	it('uses English month names for English', () => {
		expect(formatStamp('2026-04-14', 'day', 'en')).toBe('14 Apr 2026');
		expect(formatStamp('2026-12-01', 'month', 'en')).toBe('Dec 2026');
	});
});

describe('composeSiteContent per locale', () => {
	it('formats event and news dates in the requested locale', () => {
		const en = compose('en');
		expect(en.timeline.find((entry) => entry.kind === 'upcoming')?.stamp).toBe('12 Nov 2026');
		expect(en.news[0]?.stamp).toBe('20 Oct 2026');
		expect(en.news[0]?.href).toMatch(/^\/en\/novedades\//);
		expect(compose(undefined).news[0]?.stamp).toBe('20 oct 2026');
	});

	it('writes the board size sentence in the requested locale', () => {
		const head = (locale: 'es' | 'en', members: number) =>
			compose(locale, members).timeline.find((entry) => entry.kind === 'head')?.description;
		expect(head('en', 1)).toBe('One person represents the students of the program today.');
		expect(head('en', 7)).toBe('Seven members represent the students of the program today.');
		expect(head('es', 7)).toBe('Siete integrantes representan hoy a los estudiantes de la carrera.');
	});

	it('names a board photo without alt text in the requested locale', () => {
		expect(compose('en').team[0]?.photo.alt).toBe('Photo of Member 0');
		expect(compose('es').team[0]?.photo.alt).toBe('Foto de Member 0');
	});
});
