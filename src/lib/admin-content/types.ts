// Shape of the admin's `GET /api/public/content` (version 1). Mirrors the admin's public DTO: no ids, publish flags
// or timestamps, and array order is display order. `parsePublicContent` is the only way to obtain these values.

export const PUBLIC_CONTENT_VERSION = 1;

export const eventTypes = ['taller', 'charla', 'evento', 'comunidad'] as const;
export type EventType = (typeof eventTypes)[number];

// How much of an event's `date` is real. "month" means only the month is confirmed: the day in `date` is a placeholder.
// Absent in older payloads, which `parsePublicContent` reads as "day".
export const datePrecisions = ['day', 'month'] as const;
export type DatePrecision = (typeof datePrecisions)[number];

export interface PublicImage {
	url: string;
	width: number;
	height: number;
	alt: string;
}

export interface PublicEvent {
	slug: string;
	title: string;
	description: string | null;
	// YYYY-MM-DD. A date on or after today is an upcoming event.
	date: string | null;
	datePrecision: DatePrecision;
	type: EventType | null;
	commitMessage: string | null;
	hora: string | null;
	lugar: string | null;
	para: string | null;
	featured: boolean;
	linkUrl: string | null;
	linkLabel: string | null;
	highlights: string[];
	photos: PublicImage[];
}

export interface PublicFaq {
	question: string;
	answer: string;
}

export interface PublicPillar {
	word: string;
	title: string;
	text: string;
	image: PublicImage | null;
}

export interface PublicSocial {
	platform: string;
	label: string;
	handle: string;
	url: string;
	note: string | null;
	blurb: string | null;
}

// S4: name, role and photo only. Nothing else about a board member ever reaches the landing.
export interface PublicBoardMember {
	name: string;
	role: string;
	photo: PublicImage;
}

export interface PublicSiteSettings {
	tagline: string;
	description: string;
	about: string;
}

// A published news item. `body` is a small Markdown subset (paragraphs, **bold**, *italic*, [links](https://...),
// `- ` lists) that markdown.ts renders without ever emitting raw HTML.
export interface PublicNewsItem {
	// Lowercase words joined by hyphens: it becomes the URL /novedades/<slug>.
	slug: string;
	title: string;
	summary: string;
	body: string;
	// YYYY-MM-DD.
	publishedAt: string;
	cover: PublicNewsCover | null;
}

export interface PublicNewsCover extends PublicImage {
	// Unlike the other images, a cover always has alt text.
	alt: string;
}

export interface PublicContent {
	version: typeof PUBLIC_CONTENT_VERSION;
	generatedAt: string;
	events: PublicEvent[];
	faqs: PublicFaq[];
	pillars: PublicPillar[];
	socials: PublicSocial[];
	board: PublicBoardMember[];
	// null until the admin saves the settings once: the landing keeps its own copy.
	settings: PublicSiteSettings | null;
	// Newest first. Added after version 1 shipped: a payload without it is read as [].
	news: PublicNewsItem[];
}
