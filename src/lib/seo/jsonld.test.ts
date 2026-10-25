import { describe, expect, it } from 'vitest';
import { buildNewsArticle, buildOrganization, serializeJsonLd } from './jsonld';

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
