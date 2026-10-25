// schema.org structured data (JSON-LD) of the site and of its news posts. Pure builders: Layout.astro prints the result
// with serializeJsonLd, never by hand.
import { absoluteUrl } from './meta';

export type JsonLd = Record<string, unknown>;

export interface OrganizationInput {
	site: URL;
	name: string;
	// Site path of the logo (a raster image: crawlers do not all read SVG).
	logoPath: string;
	email: string;
	// Profile URLs of the organization (its socials).
	sameAs: readonly string[];
}

// The organization without `@context`, to nest it as a publisher.
function organizationNode({ site, name, logoPath, email, sameAs }: OrganizationInput): JsonLd {
	const profiles = [...new Set(sameAs)];
	return {
		'@type': 'Organization',
		name,
		url: absoluteUrl(site, '/'),
		logo: absoluteUrl(site, logoPath),
		email,
		...(profiles.length > 0 ? { sameAs: profiles } : {}),
	};
}

export function buildOrganization(input: OrganizationInput): JsonLd {
	return { '@context': 'https://schema.org', ...organizationNode(input) };
}

export interface NewsArticleInput {
	organization: OrganizationInput;
	headline: string;
	description: string;
	// YYYY-MM-DD, as the news carry it.
	datePublished: string;
	// Absolute URL of the post's share image.
	image: string;
	// BCP 47 tag of the page.
	inLanguage: string;
	// Canonical URL of the post.
	url: string;
}

export function buildNewsArticle({
	organization,
	headline,
	description,
	datePublished,
	image,
	inLanguage,
	url,
}: NewsArticleInput): JsonLd {
	return {
		'@context': 'https://schema.org',
		'@type': 'NewsArticle',
		headline,
		description,
		datePublished,
		image: [image],
		inLanguage,
		mainEntityOfPage: { '@type': 'WebPage', '@id': url },
		publisher: organizationNode(organization),
	};
}

// JSON for the inside of a <script type="application/ld+json">. Content comes from the admin, so "<" is escaped
// (nothing can write "</script>" or "<!--") and so are the separators JavaScript reads as line breaks.
export function serializeJsonLd(data: JsonLd): string {
	return JSON.stringify(data)
		.replace(/</g, '\\u003c')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
}
