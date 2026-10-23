import {
	PUBLIC_CONTENT_VERSION,
	datePrecisions,
	eventTypes,
	type DatePrecision,
	type EventType,
	type PublicBoardMember,
	type PublicContent,
	type PublicEvent,
	type PublicFaq,
	type PublicImage,
	type PublicNewsCover,
	type PublicNewsItem,
	type PublicPillar,
	type PublicSiteSettings,
	type PublicSocial,
} from './types';

export type ParseResult = { ok: true; content: PublicContent } | { ok: false; reason: string };

export interface ParseOptions {
	// The committed fallback.json may point at images bundled with the landing (`/src/assets/...`). A network payload may not.
	allowLocalImages?: boolean;
}

class Invalid extends Error {}

const fail = (path: string, expectation: string): never => {
	throw new Invalid(`${path}: ${expectation}`);
};

type Obj = Record<string, unknown>;

const isObject = (value: unknown): value is Obj => typeof value === 'object' && value !== null && !Array.isArray(value);

const object = (value: unknown, path: string): Obj => (isObject(value) ? value : fail(path, 'expected an object'));

const array = (value: unknown, path: string): unknown[] => (Array.isArray(value) ? value : fail(path, 'expected an array'));

// Generous (about twice the admin's own limits) but bounded: a buggy or hostile payload cannot bloat the page. A value
// over its cap makes the whole payload invalid, which means the fallback.
const LIMIT = {
	short: 200, // slug, labels, handles, hora/lugar/para, commit message, highlights, word, platform
	title: 240, // event title, pillar title, board name and role, FAQ question, tagline
	text: 2000, // descriptions, FAQ answers, pillar text, about
	alt: 400,
	url: 2048,
	generatedAt: 64,
	// News follow the admin's contract (S6) exactly.
	newsTitle: 120,
	newsSummary: 280,
	newsBody: 10_000,
	newsAlt: 200,
	newsSlug: 100,
} as const;

const COUNT = {
	events: 100,
	photos: 12, // per event, the admin's own cap
	highlights: 16,
	others: 50, // FAQs, pillars, socials, board
	news: 200,
} as const;

const text = (value: unknown, path: string, max: number): string => {
	if (typeof value !== 'string') return fail(path, 'expected a string');
	return value.length <= max ? value : fail(path, `expected at most ${max} characters`);
};

const nonEmpty = (value: unknown, path: string, max: number): string => {
	const content = text(value, path, max);
	return content.trim() === '' ? fail(path, 'expected a non-empty string') : content;
};

const nullable = <T>(value: unknown, path: string, read: (value: unknown, path: string) => T): T | null =>
	value === null ? null : read(value, path);

const bool = (value: unknown, path: string): boolean => (typeof value === 'boolean' ? value : fail(path, 'expected a boolean'));

// Cloudinary's own ceiling is far above any photo the landing shows; the cap keeps a buggy value (1e21) out of the markup.
const MAX_DIMENSION = 10_000;

const dimension = (value: unknown, path: string): number =>
	typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= MAX_DIMENSION
		? value
		: fail(path, `expected a positive integer of at most ${MAX_DIMENSION}`);

const httpsUrl = (value: unknown, path: string): string => {
	const url = text(value, path, LIMIT.url);
	return /^https:\/\/\S+$/i.test(url) ? url : fail(path, 'expected an https URL');
};

const calendarDate = (value: unknown, path: string): string => {
	const content = text(value, path, LIMIT.short);
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(content);
	if (match) {
		const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
		const parsed = new Date(Date.UTC(year, month - 1, day));
		if (parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day) return content;
	}
	return fail(path, 'expected a calendar date (YYYY-MM-DD)');
};

// The slug is a URL path segment (/novedades/<slug>), so it is held to lowercase words joined by single hyphens.
const NEWS_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const newsSlug = (value: unknown, path: string): string => {
	const slug = text(value, path, LIMIT.newsSlug);
	return NEWS_SLUG.test(slug) ? slug : fail(path, 'expected lowercase letters and digits joined by single hyphens');
};

const datePrecision = (value: unknown, path: string): DatePrecision =>
	(datePrecisions as readonly unknown[]).includes(value) ? (value as DatePrecision) : fail(path, `expected one of ${datePrecisions.join(', ')}`);

const eventType = (value: unknown, path: string): EventType =>
	(eventTypes as readonly unknown[]).includes(value) ? (value as EventType) : fail(path, `expected one of ${eventTypes.join(', ')}`);

const short = (value: unknown, path: string) => text(value, path, LIMIT.short);
const title = (value: unknown, path: string) => text(value, path, LIMIT.title);
const body = (value: unknown, path: string) => text(value, path, LIMIT.text);

const LOCAL_IMAGE = /^\/src\/assets\/[\w./-]+$/;
// Images are served by Cloudinary only, and only as image uploads: a `/video/upload/` or `/raw/upload/` URL (or any
// other host) would otherwise end up in an <img> that never renders. After `/image/upload/` come an optional version
// and comma-free segments: a comma would be a stored transformation (`c_fill,w_100`), which makes the srcset widths lie
// because the landing inserts its own. `?` and `#` never belong in a public id.
const CLOUDINARY_IMAGE = /^https:\/\/res\.cloudinary\.com\/[^/\s]+\/image\/upload\/(?:v\d+\/)?[^/\s,?#]+(?:\/[^/\s,?#]+)*$/;
// `..` and its encoded forms would climb out of `/image/upload/` (to `/video/upload/` or another account).
const PATH_ESCAPE = /\.\.|%2e/i;

// Every reader below copies key by key instead of spreading: whatever the payload carries beyond the documented
// keys is dropped here, which is what keeps S4 true even if the admin ever leaks a field.
const readers = (options: ParseOptions) => {
	const imageUrl = (value: unknown, path: string): string => {
		const url = text(value, path, LIMIT.url);
		if (CLOUDINARY_IMAGE.test(url) && !PATH_ESCAPE.test(url)) return url;
		if (options.allowLocalImages && LOCAL_IMAGE.test(url) && !url.includes('..')) return url;
		return fail(path, options.allowLocalImages ? 'expected a Cloudinary image URL or a /src/assets/ path' : 'expected a Cloudinary image URL (https://res.cloudinary.com/<cloud>/image/upload/...)');
	};

	const readImage = (value: unknown, path: string): PublicImage => {
		const raw = object(value, path);
		return {
			url: imageUrl(raw.url, `${path}.url`),
			width: dimension(raw.width, `${path}.width`),
			height: dimension(raw.height, `${path}.height`),
			alt: text(raw.alt, `${path}.alt`, LIMIT.alt),
		};
	};

	const readNewsCover = (value: unknown, path: string): PublicNewsCover => {
		const raw = object(value, path);
		return {
			url: imageUrl(raw.url, `${path}.url`),
			width: dimension(raw.width, `${path}.width`),
			height: dimension(raw.height, `${path}.height`),
			alt: nonEmpty(raw.alt, `${path}.alt`, LIMIT.newsAlt),
		};
	};

	const readNewsItem = (value: unknown, path: string): PublicNewsItem => {
		const raw = object(value, path);
		return {
			slug: newsSlug(raw.slug, `${path}.slug`),
			title: nonEmpty(raw.title, `${path}.title`, LIMIT.newsTitle),
			summary: nonEmpty(raw.summary, `${path}.summary`, LIMIT.newsSummary),
			body: nonEmpty(raw.body, `${path}.body`, LIMIT.newsBody),
			publishedAt: calendarDate(raw.publishedAt, `${path}.publishedAt`),
			cover: nullable(raw.cover, `${path}.cover`, readNewsCover),
		};
	};

	const list = <T>(value: unknown, path: string, max: number, read: (item: unknown, path: string) => T): T[] => {
		const items = array(value, path);
		if (items.length > max) fail(path, `expected at most ${max} entries`);
		return items.map((item, index) => read(item, `${path}[${index}]`));
	};

	const readEvent = (value: unknown, path: string): PublicEvent => {
		const raw = object(value, path);
		return {
			slug: nonEmpty(raw.slug, `${path}.slug`, LIMIT.short),
			title: nonEmpty(raw.title, `${path}.title`, LIMIT.title),
			description: nullable(raw.description, `${path}.description`, body),
			date: nullable(raw.date, `${path}.date`, calendarDate),
			// Added after version 1 shipped: a payload without it is a day-precision one.
			datePrecision: raw.datePrecision === undefined ? 'day' : datePrecision(raw.datePrecision, `${path}.datePrecision`),
			type: nullable(raw.type, `${path}.type`, eventType),
			commitMessage: nullable(raw.commitMessage, `${path}.commitMessage`, short),
			hora: nullable(raw.hora, `${path}.hora`, short),
			lugar: nullable(raw.lugar, `${path}.lugar`, short),
			para: nullable(raw.para, `${path}.para`, short),
			featured: bool(raw.featured, `${path}.featured`),
			linkUrl: nullable(raw.linkUrl, `${path}.linkUrl`, httpsUrl),
			linkLabel: nullable(raw.linkLabel, `${path}.linkLabel`, short),
			highlights: list(raw.highlights, `${path}.highlights`, COUNT.highlights, short),
			photos: list(raw.photos, `${path}.photos`, COUNT.photos, readImage),
		};
	};

	const readFaq = (value: unknown, path: string): PublicFaq => {
		const raw = object(value, path);
		return { question: nonEmpty(raw.question, `${path}.question`, LIMIT.title), answer: body(raw.answer, `${path}.answer`) };
	};

	const readPillar = (value: unknown, path: string): PublicPillar => {
		const raw = object(value, path);
		return {
			word: short(raw.word, `${path}.word`),
			title: nonEmpty(raw.title, `${path}.title`, LIMIT.title),
			text: body(raw.text, `${path}.text`),
			image: nullable(raw.image, `${path}.image`, readImage),
		};
	};

	const readSocial = (value: unknown, path: string): PublicSocial => {
		const raw = object(value, path);
		return {
			platform: nonEmpty(raw.platform, `${path}.platform`, LIMIT.short),
			label: nonEmpty(raw.label, `${path}.label`, LIMIT.short),
			handle: short(raw.handle, `${path}.handle`),
			url: httpsUrl(raw.url, `${path}.url`),
			note: nullable(raw.note, `${path}.note`, short),
			blurb: nullable(raw.blurb, `${path}.blurb`, short),
		};
	};

	const readMember = (value: unknown, path: string): PublicBoardMember => {
		const raw = object(value, path);
		return {
			name: nonEmpty(raw.name, `${path}.name`, LIMIT.title),
			role: nonEmpty(raw.role, `${path}.role`, LIMIT.title),
			photo: readImage(raw.photo, `${path}.photo`),
		};
	};

	const readSettings = (value: unknown, path: string): PublicSiteSettings => {
		const raw = object(value, path);
		return {
			tagline: nonEmpty(raw.tagline, `${path}.tagline`, LIMIT.title),
			description: nonEmpty(raw.description, `${path}.description`, LIMIT.text),
			about: nonEmpty(raw.about, `${path}.about`, LIMIT.text),
		};
	};

	return { list, readEvent, readFaq, readPillar, readSocial, readMember, readSettings, readNewsItem };
};

// Two items with one slug would be two pages at one URL.
const uniqueSlugs = (items: PublicNewsItem[]): PublicNewsItem[] => {
	const seen = new Set<string>();
	items.forEach((item, index) => {
		if (seen.has(item.slug)) fail(`news[${index}].slug`, `duplicate slug "${item.slug}"`);
		seen.add(item.slug);
	});
	return items;
};

// Validates an untrusted payload against the version 1 shape and returns a clean copy with only the documented keys.
// Never throws: a rejected payload comes back as `{ ok: false, reason }` so the caller can fall back.
export function parsePublicContent(raw: unknown, options: ParseOptions = {}): ParseResult {
	try {
		const root = object(raw, 'payload');
		if (root.version !== PUBLIC_CONTENT_VERSION) {
			fail('version', `unsupported version ${JSON.stringify(root.version)} (this landing reads version ${PUBLIC_CONTENT_VERSION})`);
		}
		const { list, readEvent, readFaq, readPillar, readSocial, readMember, readSettings, readNewsItem } = readers(options);
		return {
			ok: true,
			content: {
				version: PUBLIC_CONTENT_VERSION,
				generatedAt: text(root.generatedAt, 'generatedAt', LIMIT.generatedAt),
				events: list(root.events, 'events', COUNT.events, readEvent),
				faqs: list(root.faqs, 'faqs', COUNT.others, readFaq),
				pillars: list(root.pillars, 'pillars', COUNT.others, readPillar),
				socials: list(root.socials, 'socials', COUNT.others, readSocial),
				board: list(root.board, 'board', COUNT.others, readMember),
				settings: nullable(root.settings, 'settings', readSettings),
				// Added after version 1 shipped: an admin that does not send it yet has no news.
				news: root.news === undefined ? [] : uniqueSlugs(list(root.news, 'news', COUNT.news, readNewsItem)),
			},
		};
	} catch (error) {
		if (error instanceof Invalid) return { ok: false, reason: error.message };
		throw error;
	}
}
