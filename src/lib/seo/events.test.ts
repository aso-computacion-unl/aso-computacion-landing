import { describe, expect, it } from 'vitest';
import type { TimelineEntry } from '../admin-content/model';
import { eventAnchor, eventsStructuredData } from './events';

const organization = {
	site: new URL('https://example.test'),
	name: 'ASO',
	logoPath: '/icon-512.png',
	email: 'a@b.test',
	sameAs: [],
};
const page = {
	organization,
	inLanguage: 'es',
	pageUrl: 'https://example.test/',
	fallbackImage: 'https://example.test/og-default.png',
	openFormShown: true,
	now: Date.parse('2026-10-22T12:00:00Z'),
};
const entry = (overrides: Partial<TimelineEntry> = {}): TimelineEntry => ({
	id: 'taller-de-git',
	kind: 'upcoming',
	title: 'Taller de Git',
	description: 'Control de versiones.',
	schema: { startDate: '2026-11-12T15:00:00-05:00', endDate: '2026-11-12T17:00:00-05:00', location: 'Laboratorio' },
	...overrides,
});
const remote = { src: 'https://res.cloudinary.com/demo/image/upload/v1/a.jpg', width: 10, height: 10, alt: '' };

describe('eventsStructuredData', () => {
	it('builds one Event per upcoming entry that has schema values, and skips the rest', () => {
		const result = eventsStructuredData(
			[entry(), entry({ id: 'sin-datos', schema: undefined }), entry({ id: 'pasado', kind: 'commit' })],
			page,
		);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			'@type': 'Event',
			name: 'Taller de Git',
			url: 'https://example.test/#evento-taller-de-git',
		});
	});

	it('uses the first remote photo as the image, else the default share image', () => {
		expect(eventsStructuredData([entry({ gallery: [remote] })], page)[0].image).toEqual([remote.src]);
		expect(eventsStructuredData([entry()], page)[0].image).toEqual([page.fallbackImage]);
		const bundled = { src: { src: '/_astro/a.jpg', width: 1, height: 1, format: 'jpg' as const }, alt: '' };
		expect(eventsStructuredData([entry({ gallery: [bundled] })], page)[0].image).toEqual([page.fallbackImage]);
	});

	it('points the offer of a UNL registration to the admin page the values name', () => {
		const [event] = eventsStructuredData(
			[
				entry({
					registration: { mode: 'unl', href: 'https://admin.test/foro/eventos/taller-de-git' },
					schema: { startDate: '2026-11-12', registrationUrl: 'https://admin.test/foro/eventos/taller-de-git' },
				}),
			],
			page,
		);
		expect(event.offers).toMatchObject({ url: 'https://admin.test/foro/eventos/taller-de-git', price: '0' });
	});

	it('points the offer of an open registration to the ticket of the activity, not to its card', () => {
		const [event] = eventsStructuredData(
			[
				entry({
					registration: { mode: 'open', href: 'https://admin.test/api/x', deadline: '2026-11-12T15:00:00.000Z' },
				}),
			],
			page,
		);
		expect(event.offers).toMatchObject({
			url: 'https://example.test/#inscripciones-taller-de-git',
			validThrough: '2026-11-12T15:00:00.000Z',
		});
	});

	it('does not offer an open registration whose form is not shown, but still offers a UNL one', () => {
		const open = entry({ registration: { mode: 'open', href: 'https://admin.test/api/x' } });
		expect(eventsStructuredData([open], { ...page, openFormShown: false })[0]).not.toHaveProperty('offers');
		const unl = entry({ registration: { mode: 'unl', href: 'https://admin.test/foro/eventos/x' } });
		expect(eventsStructuredData([unl], { ...page, openFormShown: false })[0]).toHaveProperty('offers');
	});

	it('offers nothing once the deadline passed or when there is no registration', () => {
		const closed = entry({
			registration: { mode: 'open', href: 'https://admin.test/api/x', deadline: '2026-10-01T00:00:00.000Z' },
		});
		expect(eventsStructuredData([closed], page)[0]).not.toHaveProperty('offers');
		expect(eventsStructuredData([entry()], page)[0]).not.toHaveProperty('offers');
	});
});

describe('eventAnchor', () => {
	it('prefixes the slug so it can never collide with a section id', () => {
		expect(eventAnchor('faq')).toBe('evento-faq');
	});
});
