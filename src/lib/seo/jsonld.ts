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

export interface EventInput {
	organization: OrganizationInput;
	name: string;
	description?: string;
	// YYYY-MM-DD, or with an Ecuador time (YYYY-MM-DDTHH:mm:ss-05:00), as the admin writes them.
	startDate: string;
	endDate?: string;
	// Free text from the admin: it becomes the place's name and its address.
	location?: string;
	// Absolute URLs.
	image: string[];
	// BCP 47 tag of the page.
	inLanguage: string;
	// Absolute URL where the event is shown (the card on the home page).
	url: string;
	// Present when people can sign up: the page where they do (free, so the price is 0).
	registration?: { url: string; deadline?: string };
}

export function buildEvent({
	organization,
	name,
	description,
	startDate,
	endDate,
	location,
	image,
	inLanguage,
	url,
	registration,
}: EventInput): JsonLd {
	return {
		'@context': 'https://schema.org',
		'@type': 'Event',
		name,
		...(description ? { description } : {}),
		startDate,
		...(endDate ? { endDate } : {}),
		eventStatus: 'https://schema.org/EventScheduled',
		eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
		...(location ? { location: { '@type': 'Place', name: location, address: location } } : {}),
		image,
		inLanguage,
		url,
		organizer: organizationNode(organization),
		...(registration
			? {
					offers: {
						'@type': 'Offer',
						url: registration.url,
						price: '0',
						priceCurrency: 'USD',
						availability: 'https://schema.org/InStock',
						...(registration.deadline ? { validThrough: registration.deadline } : {}),
					},
				}
			: {}),
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
