import { describe, expect, it } from 'vitest';
import { absoluteUrl, buildSocialMeta, canonicalUrl, DEFAULT_SHARE_IMAGE } from './meta';

const site = new URL('https://example.test');

describe('canonicalUrl', () => {
	it('builds an absolute URL from the site and the path', () => {
		expect(canonicalUrl(site, '/')).toBe('https://example.test/');
		expect(canonicalUrl(site, '/en/')).toBe('https://example.test/en/');
	});

	it('ends page paths with a slash, the form the static build serves and the sitemap lists', () => {
		expect(canonicalUrl(site, '/novedades')).toBe('https://example.test/novedades/');
		expect(canonicalUrl(site, '/en/novedades/mi-post')).toBe('https://example.test/en/novedades/mi-post/');
	});

	it('leaves file paths and an existing slash alone, and drops query and hash', () => {
		expect(canonicalUrl(site, '/rss.xml')).toBe('https://example.test/rss.xml');
		expect(canonicalUrl(site, '/novedades/?utm=1#x')).toBe('https://example.test/novedades/');
	});

	it('is built on the origin of the site', () => {
		expect(canonicalUrl(new URL('https://example.test/landing/'), '/novedades')).toBe(
			'https://example.test/novedades/',
		);
	});
});

describe('absoluteUrl', () => {
	it('resolves site-relative URLs and keeps absolute ones', () => {
		expect(absoluteUrl(site, '/og-default.png')).toBe('https://example.test/og-default.png');
		expect(absoluteUrl(site, 'https://cdn.test/a.jpg')).toBe('https://cdn.test/a.jpg');
	});
});

describe('buildSocialMeta', () => {
	const base = {
		site,
		pathname: '/novedades',
		locale: 'es',
		title: 'Novedades',
		description: 'Lo último',
		siteName: 'ASO',
	} as const;

	it('always has an image: the default one when the page passes none', () => {
		const meta = buildSocialMeta(base);
		expect(meta.image).toBe(`https://example.test${DEFAULT_SHARE_IMAGE.path}`);
		expect(meta.imageSize).toEqual({ width: 1200, height: 630 });
	});

	it('uses the page image, absolute, with no declared size', () => {
		const meta = buildSocialMeta({ ...base, image: 'https://res.cloudinary.test/c.jpg' });
		expect(meta.image).toBe('https://res.cloudinary.test/c.jpg');
		expect(meta.imageSize).toBeUndefined();
	});

	it('describes the page for Open Graph and Twitter', () => {
		const meta = buildSocialMeta(base);
		expect(meta).toMatchObject({
			canonical: 'https://example.test/novedades/',
			url: 'https://example.test/novedades/',
			siteName: 'ASO',
			title: 'Novedades',
			description: 'Lo último',
			type: 'website',
			twitterCard: 'summary_large_image',
		});
	});

	it('names the locale and the alternate ones', () => {
		expect(buildSocialMeta(base)).toMatchObject({ locale: 'es_EC', alternateLocales: ['en_US'] });
		expect(buildSocialMeta({ ...base, locale: 'en', pathname: '/en/novedades/' })).toMatchObject({
			locale: 'en_US',
			alternateLocales: ['es_EC'],
			canonical: 'https://example.test/en/novedades/',
		});
	});

	it('passes the type through', () => {
		expect(buildSocialMeta({ ...base, type: 'article' }).type).toBe('article');
	});
});
