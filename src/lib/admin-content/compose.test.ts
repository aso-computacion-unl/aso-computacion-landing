import type { ImageMetadata } from 'astro';
import { describe, expect, it } from 'vitest';
import { composeSiteContent, type Baseline } from './compose';
import type { LoadedContent } from './load';
import type { Photo } from './model';
import { image, payload } from './test-fixtures';

const NOW = new Date('2026-10-22T15:00:00Z');
const local = (path: string) => ({ src: path, width: 10, height: 10, format: 'jpg' }) as unknown as ImageMetadata;
const resolveLocal = (path: string) => local(path);
const photo = (name: string): Photo => ({ src: local(name), alt: name });

const baseline: Baseline = {
	site: { name: 'ASO', tagline: 'base tagline', headline: ['a'], headlineAccent: 0, heroCue: 'cue', description: 'base desc', about: 'base about' },
	navLinks: [
		{ label: 'Actividades', href: '#actividades' },
		{ label: 'Nosotros', href: '#nosotros' },
		{ label: 'Directiva', href: '#directiva' },
		{ label: 'FAQ', href: '#faq' },
		{ label: 'Redes', href: '#redes' },
	],
	anchors: {
		next: { id: 'proxima-actividad', kind: 'next', stamp: 'Lo que sigue', title: 'next' },
		head: { id: 'directiva-actual', kind: 'head', stamp: 'HEAD', title: 'Directiva actual', description: 'old', href: '#directiva', hrefLabel: 'Conocer' },
		initial: { id: 'fundacion', kind: 'initial', stamp: '2020', title: 'Nace' },
	},
	demo: {
		events: [
			{ id: 'demo-future', date: '2026-12-11', stamp: '11 dic 2026', title: 'Demo future', demo: true, image: photo('future.jpg') },
			{ id: 'demo-past', date: '2026-05-20', stamp: '20 may 2026', title: 'Demo past', demo: true, image: photo('past.jpg') },
		],
		pillars: [{ id: 'demo-pillar', word: 'VOZ', title: 'Demo pillar', text: 't', demo: true }],
		faqItems: [{ topic: 'costo', q: 'Demo?', a: 'Sí.' }],
		boardFun: { 'Ana Pérez': { language: 'Go', motto: 'm', demo: true } },
		collage: [photo('stock.jpg')],
	},
};

const api = (content = payload()): LoadedContent => ({ source: 'api', content });
const fallback = (content = payload({ events: [], faqs: [], pillars: [] })): LoadedContent => ({ source: 'fallback', content, reason: 'test' });
const compose = (loaded: LoadedContent, now = NOW) => composeSiteContent({ loaded, baseline, now, resolveLocal });

describe('composeSiteContent: month-only dates', () => {
	const e = payload().events[0];

	it('shows the month chip and orders by the first of the month', () => {
		const events = [
			{ ...e, slug: 'dated', date: '2026-02-05', datePrecision: 'day' as const, highlights: [] },
			{ ...e, slug: 'month', date: '2026-02-01', datePrecision: 'month' as const, highlights: [] },
		];
		const timeline = compose(api(payload({ events }))).timeline;
		const month = timeline.find((entry) => entry.id === 'month');
		expect(month?.stamp).toBe('feb 2026');
		expect(timeline.map((entry) => entry.id).filter((id) => id === 'dated' || id === 'month')).toEqual(['dated', 'month']);
	});

	it('never feeds the countdown with a month-only event, even when it is the nearest upcoming one', () => {
		const events = [
			{ ...e, slug: 'month', date: '2026-11-01', datePrecision: 'month' as const },
			{ ...e, slug: 'dated', date: '2026-12-12', datePrecision: 'day' as const },
		];
		const result = compose(api(payload({ events })));
		expect(result.nextEvent?.id).toBe('dated');
		expect(result.timeline.find((entry) => entry.id === 'month')?.kind).toBe('upcoming');
		expect(compose(api(payload({ events: [events[0]] }))).nextEvent).toBeUndefined();
	});
});

describe('composeSiteContent: API path', () => {
	it('never adds demo content', () => {
		const result = compose(api(payload({ events: [], faqs: [], pillars: [] })));
		expect(result.timeline.map((e) => e.id)).toEqual(['proxima-actividad', 'directiva-actual', 'fundacion']);
		expect(result.timeline.some((e) => e.demo)).toBe(false);
		expect(result.faqItems).toEqual([]);
		expect(result.pillars).toEqual([]);
		expect(result.team.every((m) => !('fun' in m))).toBe(true);
		expect(result.collage).toEqual([]);
	});

	it('lays out the timeline as next, upcoming, HEAD, past, initial', () => {
		const e = payload().events[0];
		const events = [
			{ ...e, slug: 'later', date: '2026-12-01' },
			{ ...e, slug: 'sooner', date: '2026-11-01' },
			{ ...e, slug: 'last-month', date: '2026-09-01' },
			{ ...e, slug: 'undated', date: null },
		];
		const result = compose(api(payload({ events })));
		expect(result.timeline.map((x) => `${x.id}:${x.kind}`)).toEqual([
			'proxima-actividad:next',
			'later:upcoming',
			'sooner:upcoming',
			'directiva-actual:head',
			'last-month:commit',
			'undated:commit',
			'fundacion:initial',
		]);
	});

	it('feeds the countdown with the nearest upcoming dated event', () => {
		const e = payload().events[0];
		const result = compose(api(payload({ events: [{ ...e, slug: 'later', date: '2026-12-01' }, { ...e, slug: 'sooner', date: '2026-11-01' }] })));
		expect(result.nextEvent?.id).toBe('sooner');
		expect(compose(api(payload({ events: [] }))).nextEvent).toBeUndefined();
	});

	it('moves an event from upcoming to history as the build date passes it', () => {
		const e = { ...payload().events[0], slug: 'x', date: '2026-10-25' };
		expect(compose(api(payload({ events: [e] })), new Date('2026-10-25T12:00:00Z')).timeline.find((t) => t.id === 'x')?.kind).toBe('upcoming');
		expect(compose(api(payload({ events: [e] })), new Date('2026-10-27T12:00:00Z')).timeline.find((t) => t.id === 'x')?.kind).toBe('commit');
	});

	it('uses the settings when present and the landing copy when null', () => {
		expect(compose(api()).site.tagline).toBe('Tagline');
		expect(compose(api(payload({ settings: null }))).site.tagline).toBe('base tagline');
	});

	it('does not invent or drop entries: counts match the payload', () => {
		const content = payload();
		const result = compose(api(content));
		expect(result.faqItems).toHaveLength(content.faqs.length);
		expect(result.pillars).toHaveLength(content.pillars.length);
		expect(result.socials).toHaveLength(content.socials.length);
		expect(result.team).toHaveLength(content.board.length);
		expect(result.timeline.filter((t) => !['next', 'head', 'initial'].includes(t.kind))).toHaveLength(content.events.length);
	});

	it('describes the board in the HEAD entry from the real count', () => {
		const member = payload().board[0];
		const seven = Array.from({ length: 7 }, (_, i) => ({ ...member, name: `M${i}` }));
		expect(compose(api(payload({ board: seven }))).timeline.find((t) => t.kind === 'head')?.description).toBe('Siete integrantes representan hoy a los estudiantes de la carrera.');
		expect(compose(api(payload({ board: [member] }))).timeline.find((t) => t.kind === 'head')?.description).toBe('Una persona representa hoy a los estudiantes de la carrera.');
		const empty = compose(api(payload({ board: [] }))).timeline.find((t) => t.kind === 'head');
		expect(empty?.description).toBeUndefined();
		expect(empty?.href).toBeUndefined();
	});

	it('builds the collage from event photos only, deduplicated and capped', () => {
		const e = payload().events[0];
		const many = Array.from({ length: 15 }, (_, i) => image({ url: `https://res.cloudinary.com/x/${i % 13}.jpg` }));
		const result = compose(api(payload({ events: [{ ...e, photos: many }] })));
		expect(result.collage).toHaveLength(12);
		expect(new Set(result.collage.map((p) => p.src)).size).toBe(12);
	});

	it('hides nav links of sections with nothing to show', () => {
		const bare = compose(api(payload({ faqs: [], board: [], socials: [] })));
		expect(bare.navLinks.map((l) => l.href)).toEqual(['#actividades', '#nosotros']);
		expect(compose(api()).navLinks).toHaveLength(5);
	});
});

describe('composeSiteContent: fallback path', () => {
	it('merges the demo events by date, keeping real ones, and derives their kind', () => {
		const result = compose(fallback());
		expect(result.timeline.map((t) => `${t.id}:${t.kind}`)).toEqual(['proxima-actividad:next', 'demo-future:upcoming', 'directiva-actual:head', 'demo-past:commit', 'fundacion:initial']);
		expect(result.timeline.filter((t) => t.demo)).toHaveLength(2);
	});

	it('interleaves real and demo history newest first, undated last', () => {
		const e = payload().events[0];
		const content = payload({ events: [{ ...e, slug: 'real-april', date: '2026-04-14' }, { ...e, slug: 'real-undated', date: null }, { ...e, slug: 'real-june', date: '2026-06-01' }], faqs: [], pillars: [] });
		const ids = compose(fallback(content)).timeline.map((t) => t.id);
		expect(ids.slice(ids.indexOf('directiva-actual') + 1)).toEqual(['real-june', 'demo-past', 'real-april', 'real-undated', 'fundacion']);
	});

	it('turns a demo event into history once its date passes', () => {
		const result = compose(fallback(), new Date('2027-01-05T12:00:00Z'));
		expect(result.timeline.find((t) => t.id === 'demo-future')?.kind).toBe('commit');
		expect(result.nextEvent).toBeUndefined();
	});

	it('fills empty FAQ and pillars with the demo ones, but not when the snapshot has real ones', () => {
		const empty = compose(fallback());
		expect(empty.faqItems.map((f) => f.q)).toEqual(['Demo?']);
		expect(empty.pillars.map((p) => p.id)).toEqual(['demo-pillar']);
		const real = compose(fallback(payload({ events: [] })));
		expect(real.faqItems.map((f) => f.q)).toEqual(['¿Quién puede participar?']);
		expect(real.pillars.map((p) => p.title)).toEqual(['Representamos']);
	});

	it('flags the FAQ as demo only while it is showing placeholders', () => {
		expect(compose(fallback()).faqIsDemo).toBe(true);
		expect(compose(fallback(payload({ events: [] }))).faqIsDemo).toBe(false);
		expect(compose(api(payload({ faqs: [] }))).faqIsDemo).toBe(false);
	});

	it('attaches the demo extras to board members by name only', () => {
		const other = { ...payload().board[0], name: 'Luis Gómez' };
		const result = compose(fallback(payload({ events: [], board: [payload().board[0], other] })));
		expect(result.team[0].fun).toMatchObject({ language: 'Go' });
		expect('fun' in result.team[1]).toBe(false);
	});

	it('appends the stock collage photos after the event photos', () => {
		const result = compose(fallback());
		expect(result.collage.map((p) => p.alt)).toEqual(['future.jpg', 'past.jpg', 'stock.jpg']);
	});
});
