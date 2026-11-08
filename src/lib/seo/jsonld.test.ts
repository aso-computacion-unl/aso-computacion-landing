import { describe, expect, it } from 'vitest';
import { buildEvent, buildNewsArticle, buildOrganization, serializeJsonLd } from './jsonld';

const site = new URL('https://example.test');
const organizationInput = {
	site,
	name: 'ASO Computación',
	logoPath: '/icon-512.png',
	email: 'role@example.test',
	sameAs: ['https://www.instagram.com/aso/', 'https://www.linkedin.com/company/aso/'],
};

describe('buildOrganization', () => {
	it('describes the organization with absolute URLs', () => {
		expect(buildOrganization(organizationInput)).toEqual({
			'@context': 'https://schema.org',
			'@type': 'Organization',
			name: 'ASO Computación',
			url: 'https://example.test/',
			logo: 'https://example.test/icon-512.png',
			email: 'role@example.test',
			sameAs: ['https://www.instagram.com/aso/', 'https://www.linkedin.com/company/aso/'],
		});
	});

	it('leaves sameAs out when there are no socials, and drops repeated ones', () => {
		expect(buildOrganization({ ...organizationInput, sameAs: [] })).not.toHaveProperty('sameAs');
		const { sameAs } = buildOrganization({ ...organizationInput, sameAs: ['https://a.test/', 'https://a.test/'] });
		expect(sameAs).toEqual(['https://a.test/']);
	});
});

describe('buildNewsArticle', () => {
	const input = {
		organization: organizationInput,
		headline: 'Resultados del torneo',
		description: 'Quién ganó y cómo.',
		datePublished: '2026-10-20',
		image: 'https://res.cloudinary.test/c.jpg',
		inLanguage: 'es',
		url: 'https://example.test/novedades/torneo/',
	};

	it('maps a post to a NewsArticle published by the organization', () => {
		const article = buildNewsArticle(input);
		expect(article).toMatchObject({
			'@context': 'https://schema.org',
			'@type': 'NewsArticle',
			headline: 'Resultados del torneo',
			description: 'Quién ganó y cómo.',
			datePublished: '2026-10-20',
			image: ['https://res.cloudinary.test/c.jpg'],
			inLanguage: 'es',
			mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://example.test/novedades/torneo/' },
		});
		expect(article.publisher).toMatchObject({ '@type': 'Organization', name: 'ASO Computación' });
	});

	it('nests the organization without repeating the context', () => {
		expect(buildNewsArticle(input).publisher).not.toHaveProperty('@context');
	});
});

describe('serializeJsonLd', () => {
	it('round-trips the data', () => {
		const data = { '@type': 'Thing', name: 'a "quoted" & <b>' };
		expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
	});

	it('cannot close the script tag or open a comment', () => {
		const out = serializeJsonLd({ name: '</script><script>alert(1)</script><!--' });
		expect(out).not.toContain('<');
		expect(out).toContain('\\u003c/script>');
	});

	it('escapes the line separators JavaScript treats as newlines', () => {
		const out = serializeJsonLd({ name: 'a\u2028b\u2029c' });
		expect(out).not.toMatch(/[\u2028\u2029]/);
		expect(JSON.parse(out).name).toBe('a\u2028b\u2029c');
	});
});

describe('buildEvent', () => {
	const input = {
		organization: organizationInput,
		name: 'Taller de Git',
		description: 'Control de versiones desde cero.',
		startDate: '2026-11-12T15:00:00-05:00',
		endDate: '2026-11-12T17:00:00-05:00',
		location: 'Laboratorio 2',
		image: ['https://res.cloudinary.test/taller.jpg'],
		inLanguage: 'es',
		url: 'https://example.test/#evento-taller-de-git',
	};

	it('maps an event to a schema.org Event organized by the association', () => {
		expect(buildEvent(input)).toEqual({
			'@context': 'https://schema.org',
			'@type': 'Event',
			name: 'Taller de Git',
			description: 'Control de versiones desde cero.',
			startDate: '2026-11-12T15:00:00-05:00',
			endDate: '2026-11-12T17:00:00-05:00',
			eventStatus: 'https://schema.org/EventScheduled',
			eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
			location: { '@type': 'Place', name: 'Laboratorio 2', address: 'Laboratorio 2' },
			image: ['https://res.cloudinary.test/taller.jpg'],
			inLanguage: 'es',
			url: 'https://example.test/#evento-taller-de-git',
			organizer: {
				'@type': 'Organization',
				name: 'ASO Computación',
				url: 'https://example.test/',
				logo: 'https://example.test/icon-512.png',
				email: 'role@example.test',
				sameAs: ['https://www.instagram.com/aso/', 'https://www.linkedin.com/company/aso/'],
			},
		});
	});

	it('leaves out what the event does not have', () => {
		const event = buildEvent({ ...input, description: undefined, endDate: undefined, location: undefined });
		for (const key of ['description', 'endDate', 'location', 'offers']) expect(event).not.toHaveProperty(key);
	});

	it('offers free registration at the given URL, valid until the deadline', () => {
		const event = buildEvent({
			...input,
			registration: {
				url: 'https://admin.example.test/inscripciones/taller-de-git',
				deadline: '2026-11-12T15:00:00.000Z',
			},
		});
		expect(event.offers).toEqual({
			'@type': 'Offer',
			url: 'https://admin.example.test/inscripciones/taller-de-git',
			price: '0',
			priceCurrency: 'USD',
			availability: 'https://schema.org/InStock',
			validThrough: '2026-11-12T15:00:00.000Z',
		});
		expect(buildEvent({ ...input, registration: { url: 'https://example.test/' } }).offers).not.toHaveProperty(
			'validThrough',
		);
	});

	it('cannot be broken out of its script tag by event text', () => {
		const html = serializeJsonLd(buildEvent({ ...input, name: '</script><script>alert(1)</script>' }));
		expect(html).not.toContain('</script>');
		expect(html).toContain('\\u003c/script>');
	});
});
