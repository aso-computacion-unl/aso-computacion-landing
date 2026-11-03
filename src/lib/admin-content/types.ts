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

export const registrationModes = ['unl', 'open'] as const;
export type RegistrationMode = (typeof registrationModes)[number];

// S8: how people sign up for one event. Added after version 1 shipped: a payload without it is read as null (no
// registration). The seats left are never published (the landing is static): `capacity` is the total.
export interface PublicEventRegistration {
	mode: RegistrationMode;
	// Seats; null is unlimited.
	capacity: number | null;
	// ISO UTC instant after which registration is closed (exclusive); null closes it with the event day.
	deadline: string | null;
	// `unl` only: the admin's page where a student signs in with the institutional Google account.
	url: string | null;
	// `open` only: where the landing's form POSTs.
	endpoint: string | null;
}

// S8: values for a schema.org Event, in Ecuador time (-05:00). Null without an exact day.
export interface PublicEventStructuredData {
	// YYYY-MM-DD when the time is unknown, else YYYY-MM-DDTHH:mm:00-05:00.
	startDate: string;
	endDate: string | null;
	location: string | null;
	registrationUrl: string | null;
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
	// S8, all three added after version 1 shipped: a payload without them reads as null.
	registration: PublicEventRegistration | null;
	// The admin's `.ics` download for this event.
	calendarUrl: string | null;
	structuredData: PublicEventStructuredData | null;
}

export interface PublicFaq {
	question: string;
	answer: string;
	// The topic of `git help <command>`. Absent in older payloads, which `parsePublicContent` reads as null: the landing
	// then derives the topic from the question.
	command?: string | null;
}

// A published free command of the FAQ terminal: the shell runs `command` and prints `output`.
export interface PublicCommand {
	id: string;
	command: string;
	// One line, shown next to the command in `help`.
	description: string;
	// Multi-line text.
	output: string;
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

// S9: a headline number. `value` is free text meant to be shown big ("120+", "3 años"); `label` says what it counts.
export interface PublicImpactStat {
	value: string;
	label: string;
}

// S9: a quote, who said it and, optionally, their photo. Plain text only; nothing else about the person reaches the page.
export interface PublicTestimonial {
	quote: string;
	name: string;
	// Role or affiliation.
	role: string;
	// Always has alt text when present; null renders the card without a photo.
	photo: PublicNewsCover | null;
}

// S9: an ally. A sponsor is never published without its logo, which always has alt text.
export interface PublicSponsor {
	name: string;
	logo: PublicNewsCover;
	// Absolute https URL to wrap the logo in; null renders the logo without a link.
	url: string | null;
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
	// In display order. Added after version 1 shipped: a payload without it is read as [].
	commands: PublicCommand[];
	// In admin order. Added after version 1 shipped (S9): a payload without any of the three is read as [].
	impact: PublicImpactStat[];
	testimonials: PublicTestimonial[];
	sponsors: PublicSponsor[];
}
