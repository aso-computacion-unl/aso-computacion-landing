import { describe, expect, it } from 'vitest';
import type { ImageMetadata } from 'astro';
import { eventKind, formatStamp, sortEvents, toTimelineEntry, todayInEcuador } from './timeline';
import { image, payload } from './test-fixtures';
import type { PublicEvent } from './types';

const TODAY = '2026-10-22';
const local = (path: string) =>
	({ src: `/@fs${path}`, width: 10, height: 10, format: 'jpg' }) as unknown as ImageMetadata;
const ctx = { today: TODAY, resolveLocal: (path: string) => (path.includes('missing') ? undefined : local(path)) };

const event = (overrides: Partial<PublicEvent> = {}): PublicEvent => ({ ...payload().events[0], ...overrides });

describe('dates', () => {
	it('formats the stamp like the current copy (day, short Spanish month, year)', () => {
		expect(formatStamp('2026-04-14')).toBe('14 abr 2026');
		expect(formatStamp('2026-12-01')).toBe('1 dic 2026');
		expect(formatStamp('2026-09-18')).toBe('18 sep 2026');
	});

	it('formats a month-only stamp as month and year, never a day', () => {
		expect(formatStamp('2026-02-01', 'month')).toBe('feb 2026');
		expect(formatStamp('2026-02-20', 'month')).toBe('feb 2026');
		expect(formatStamp('2026-12-31', 'month')).toBe('dic 2026');
		expect(formatStamp('2026-02-20', 'day')).toBe('20 feb 2026');
	});

	it('takes today in Ecuador time, not UTC', () => {
		expect(todayInEcuador(new Date('2026-10-23T03:00:00Z'))).toBe('2026-10-22');
		expect(todayInEcuador(new Date('2026-10-23T05:00:00Z'))).toBe('2026-10-23');
	});
});

describe('eventKind', () => {
	it('derives the kind from the date', () => {
		expect(eventKind(event({ date: '2026-12-11' }), TODAY)).toBe('upcoming');
		expect(eventKind(event({ date: TODAY }), TODAY)).toBe('upcoming');
		expect(eventKind(event({ date: '2026-10-21' }), TODAY)).toBe('commit');
		expect(eventKind(event({ date: null }), TODAY)).toBe('commit');
	});

	it('treats a month-only event as the first day of its month', () => {
		const month = (date: string, extra: Partial<PublicEvent> = {}) => event({ date, datePrecision: 'month', ...extra });
		expect(eventKind(month('2026-11-20'), TODAY)).toBe('upcoming');
		expect(eventKind(month('2026-11-01'), TODAY)).toBe('upcoming');
		// This month's first day is already behind us, so the month-only event is no longer upcoming.
		expect(eventKind(month('2026-10-30'), TODAY)).toBe('commit');
		expect(eventKind(month('2026-10-01'), '2026-10-01'), 'on the first of the month').toBe('upcoming');
		expect(eventKind(month('2026-02-20', { highlights: ['FLISOL'] }), TODAY)).toBe('merge');
		expect(eventKind(month(null as never), TODAY)).toBe('commit');
	});

	it('makes a past event with highlights a merge, but an upcoming one stays upcoming', () => {
		expect(eventKind(event({ date: '2026-02-10', highlights: ['FLISOL'] }), TODAY)).toBe('merge');
		expect(eventKind(event({ date: '2026-12-10', highlights: ['FLISOL'] }), TODAY)).toBe('upcoming');
	});
});

describe('sortEvents', () => {
	it('orders by date descending with undated last, keeping ties stable', () => {
		const list = [
			event({ slug: 'a', date: null }),
			event({ slug: 'b', date: '2026-01-01' }),
			event({ slug: 'c', date: '2026-06-01' }),
			event({ slug: 'd', date: '2026-06-01' }),
		];
		expect(sortEvents(list).map((e) => e.slug)).toEqual(['c', 'd', 'b', 'a']);
	});

	it('sorts a month-only event as the first of its month', () => {
		const list = [
			event({ slug: 'feb-month', date: '2026-02-28', datePrecision: 'month' }),
			event({ slug: 'feb-5', date: '2026-02-05', datePrecision: 'day' }),
			event({ slug: 'jan-31', date: '2026-01-31', datePrecision: 'day' }),
		];
		expect(sortEvents(list).map((e) => e.slug)).toEqual(['feb-5', 'feb-month', 'jan-31']);
	});

	it('does not mutate its input', () => {
		const list = [event({ slug: 'a', date: '2026-01-01' }), event({ slug: 'b', date: '2026-06-01' })];
		sortEvents(list);
		expect(list.map((e) => e.slug)).toEqual(['a', 'b']);
	});
});

describe('toTimelineEntry', () => {
	it('maps the fields the components render', () => {
		const entry = toTimelineEntry(event({ date: '2026-11-12' }), ctx);
		expect(entry).toMatchObject({
			id: 'taller-de-git',
			kind: 'upcoming',
			stamp: '12 nov 2026',
			title: 'Taller de Git',
			description: 'Control de versiones desde cero.',
			date: '2026-11-12',
			type: 'taller',
			msg: 'feat(taller): git init',
			featured: true,
			href: 'https://example.com/inscripcion',
			hrefLabel: 'Inscribirme',
		});
		expect(entry.meta).toEqual({ hora: '15:00', lugar: 'Laboratorio', para: 'primer ciclo' });
		expect(entry.demo).toBeUndefined();
	});

	it('shows a month-only event as "feb 2026", keeps a sortable first-of-month date and never claims a day', () => {
		const entry = toTimelineEntry(event({ date: '2026-02-20', datePrecision: 'month', highlights: ['FLISOL'] }), ctx);
		expect(entry).toMatchObject({ stamp: 'feb 2026', date: '2026-02-01', datePrecision: 'month', kind: 'merge' });
		expect(JSON.stringify(entry)).not.toMatch(/20 feb|2026-02-20/);
		expect(toTimelineEntry(event({ date: '2026-02-20' }), ctx)).toMatchObject({
			stamp: '20 feb 2026',
			date: '2026-02-20',
		});
		expect(toTimelineEntry(event({ date: '2026-02-20' }), ctx).datePrecision).toBeUndefined();
	});

	it('drops null optionals instead of rendering them', () => {
		const entry = toTimelineEntry(
			event({
				description: null,
				date: null,
				type: null,
				commitMessage: null,
				hora: null,
				lugar: null,
				para: null,
				linkUrl: null,
				linkLabel: null,
				featured: false,
				photos: [],
			}),
			ctx,
		);
		expect(entry.stamp).toBeUndefined();
		expect(entry.date).toBeUndefined();
		expect(entry.meta).toBeUndefined();
		expect(entry.href).toBeUndefined();
		expect(entry.image).toBeUndefined();
		expect(entry.gallery).toBeUndefined();
	});

	it('keeps only the known meta keys, in hora, lugar, para order', () => {
		expect(Object.keys(toTimelineEntry(event({ hora: null, lugar: 'Aula', para: 'todos' }), ctx).meta ?? {})).toEqual([
			'lugar',
			'para',
		]);
	});

	it('gives a link without label a readable default', () => {
		expect(toTimelineEntry(event({ linkLabel: null }), ctx).hrefLabel).toBe('Más información');
	});

	it('turns highlights into a branch named after the slug', () => {
		const entry = toTimelineEntry(
			event({
				slug: 'semana',
				date: '2026-02-10',
				highlights: ['FLISOL', 'Ponencias sobre las últimas tendencias', 'FLISOL'],
			}),
			ctx,
		);
		expect(entry.kind).toBe('merge');
		expect(entry.branch?.name).toBe('semana');
		expect(entry.branch?.commits.map((c) => c.title)).toEqual([
			'FLISOL',
			'Ponencias sobre las últimas tendencias',
			'FLISOL',
		]);
		const ids = entry.branch?.commits.map((c) => c.id) ?? [];
		expect(ids[0]).toBe('flisol');
		expect(ids[1]).toBe('ponencias-sobre-las-ultimas-tendencias');
		expect(new Set(ids).size).toBe(3);
	});

	it('does not draw a branch for an upcoming event', () => {
		expect(toTimelineEntry(event({ date: '2026-12-01', highlights: ['FLISOL'] }), ctx).branch).toBeUndefined();
	});

	it('shows the first photo and keeps the whole gallery', () => {
		const photos = [
			image({ url: 'https://res.cloudinary.com/x/1.jpg', alt: 'uno' }),
			image({ url: 'https://res.cloudinary.com/x/2.jpg', alt: 'dos' }),
		];
		const entry = toTimelineEntry(event({ photos }), ctx);
		expect(entry.image).toMatchObject({
			src: 'https://res.cloudinary.com/x/1.jpg',
			alt: 'uno',
			width: 1200,
			height: 800,
		});
		expect(entry.gallery).toHaveLength(2);
	});
});
