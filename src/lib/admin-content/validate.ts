import {
	PUBLIC_CONTENT_VERSION,
	eventTypes,
	type EventType,
	type PublicBoardMember,
	type PublicContent,
	type PublicEvent,
	type PublicFaq,
	type PublicImage,
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

const str = (value: unknown, path: string): string => (typeof value === 'string' ? value : fail(path, 'expected a string'));

const nonEmpty = (value: unknown, path: string): string => {
	const text = str(value, path);
	return text.trim() === '' ? fail(path, 'expected a non-empty string') : text;
};

const nullable = <T>(value: unknown, path: string, read: (value: unknown, path: string) => T): T | null =>
	value === null ? null : read(value, path);

const bool = (value: unknown, path: string): boolean => (typeof value === 'boolean' ? value : fail(path, 'expected a boolean'));

const dimension = (value: unknown, path: string): number =>
	typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fail(path, 'expected a positive integer');

const httpUrl = (value: unknown, path: string): string => {
	const url = str(value, path);
	return /^https?:\/\/\S+$/i.test(url) ? url : fail(path, 'expected an http(s) URL');
};

const calendarDate = (value: unknown, path: string): string => {
	const text = str(value, path);
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
	if (match) {
		const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
		const parsed = new Date(Date.UTC(year, month - 1, day));
		if (parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day) return text;
	}
	return fail(path, 'expected a calendar date (YYYY-MM-DD)');
};

const eventType = (value: unknown, path: string): EventType =>
	(eventTypes as readonly unknown[]).includes(value) ? (value as EventType) : fail(path, `expected one of ${eventTypes.join(', ')}`);

const LOCAL_IMAGE = /^\/src\/assets\/[\w./-]+$/;

// Every reader below copies key by key instead of spreading: whatever the payload carries beyond the documented
// keys is dropped here, which is what keeps S4 true even if the admin ever leaks a field.
const readers = (options: ParseOptions) => {
	const imageUrl = (value: unknown, path: string): string => {
		const url = str(value, path);
		if (/^https:\/\/\S+$/i.test(url)) return url;
		if (options.allowLocalImages && LOCAL_IMAGE.test(url) && !url.includes('..')) return url;
		return fail(path, options.allowLocalImages ? 'expected an https URL or a /src/assets/ path' : 'expected an https URL');
	};

	const readImage = (value: unknown, path: string): PublicImage => {
		const raw = object(value, path);
		return {
			url: imageUrl(raw.url, `${path}.url`),
			width: dimension(raw.width, `${path}.width`),
			height: dimension(raw.height, `${path}.height`),
			alt: str(raw.alt, `${path}.alt`),
		};
	};

	const list = <T>(value: unknown, path: string, read: (item: unknown, path: string) => T): T[] =>
		array(value, path).map((item, index) => read(item, `${path}[${index}]`));

	const readEvent = (value: unknown, path: string): PublicEvent => {
		const raw = object(value, path);
		return {
			slug: nonEmpty(raw.slug, `${path}.slug`),
			title: nonEmpty(raw.title, `${path}.title`),
			description: nullable(raw.description, `${path}.description`, str),
			date: nullable(raw.date, `${path}.date`, calendarDate),
			type: nullable(raw.type, `${path}.type`, eventType),
			commitMessage: nullable(raw.commitMessage, `${path}.commitMessage`, str),
			hora: nullable(raw.hora, `${path}.hora`, str),
			lugar: nullable(raw.lugar, `${path}.lugar`, str),
			para: nullable(raw.para, `${path}.para`, str),
			featured: bool(raw.featured, `${path}.featured`),
			linkUrl: nullable(raw.linkUrl, `${path}.linkUrl`, httpUrl),
			linkLabel: nullable(raw.linkLabel, `${path}.linkLabel`, str),
			highlights: list(raw.highlights, `${path}.highlights`, str),
			photos: list(raw.photos, `${path}.photos`, readImage),
		};
	};

	const readFaq = (value: unknown, path: string): PublicFaq => {
		const raw = object(value, path);
		return { question: nonEmpty(raw.question, `${path}.question`), answer: str(raw.answer, `${path}.answer`) };
	};

	const readPillar = (value: unknown, path: string): PublicPillar => {
		const raw = object(value, path);
		return {
			word: str(raw.word, `${path}.word`),
			title: nonEmpty(raw.title, `${path}.title`),
			text: str(raw.text, `${path}.text`),
			image: nullable(raw.image, `${path}.image`, readImage),
		};
	};

	const readSocial = (value: unknown, path: string): PublicSocial => {
		const raw = object(value, path);
		return {
			platform: nonEmpty(raw.platform, `${path}.platform`),
			label: nonEmpty(raw.label, `${path}.label`),
			handle: str(raw.handle, `${path}.handle`),
			url: httpUrl(raw.url, `${path}.url`),
			note: nullable(raw.note, `${path}.note`, str),
			blurb: nullable(raw.blurb, `${path}.blurb`, str),
		};
	};

	const readMember = (value: unknown, path: string): PublicBoardMember => {
		const raw = object(value, path);
		return { name: nonEmpty(raw.name, `${path}.name`), role: nonEmpty(raw.role, `${path}.role`), photo: readImage(raw.photo, `${path}.photo`) };
	};

	const readSettings = (value: unknown, path: string): PublicSiteSettings => {
		const raw = object(value, path);
		return {
			tagline: nonEmpty(raw.tagline, `${path}.tagline`),
			description: nonEmpty(raw.description, `${path}.description`),
			about: nonEmpty(raw.about, `${path}.about`),
		};
	};

	return { list, readEvent, readFaq, readPillar, readSocial, readMember, readSettings };
};

// Validates an untrusted payload against the version 1 shape and returns a clean copy with only the documented keys.
// Never throws: a rejected payload comes back as `{ ok: false, reason }` so the caller can fall back.
export function parsePublicContent(raw: unknown, options: ParseOptions = {}): ParseResult {
	try {
		const root = object(raw, 'payload');
		if (root.version !== PUBLIC_CONTENT_VERSION) {
			fail('version', `unsupported version ${JSON.stringify(root.version)} (this landing reads version ${PUBLIC_CONTENT_VERSION})`);
		}
		const { list, readEvent, readFaq, readPillar, readSocial, readMember, readSettings } = readers(options);
		return {
			ok: true,
			content: {
				version: PUBLIC_CONTENT_VERSION,
				generatedAt: str(root.generatedAt, 'generatedAt'),
				events: list(root.events, 'events', readEvent),
				faqs: list(root.faqs, 'faqs', readFaq),
				pillars: list(root.pillars, 'pillars', readPillar),
				socials: list(root.socials, 'socials', readSocial),
				board: list(root.board, 'board', readMember),
				settings: nullable(root.settings, 'settings', readSettings),
			},
		};
	} catch (error) {
		if (error instanceof Invalid) return { ok: false, reason: error.message };
		throw error;
	}
}
