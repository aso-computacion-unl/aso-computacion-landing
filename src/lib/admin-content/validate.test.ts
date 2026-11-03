import { describe, expect, it } from 'vitest';
import { image, newsItem, payload } from './test-fixtures';
import { parsePublicContent } from './validate';

const ok = (raw: unknown, options?: Parameters<typeof parsePublicContent>[1]) => {
	const result = parsePublicContent(raw, options);
	if (!result.ok) throw new Error(`expected a valid payload, got: ${result.reason}`);
	return result.content;
};
const reason = (raw: unknown, options?: Parameters<typeof parsePublicContent>[1]) => {
	const result = parsePublicContent(raw, options);
	if (result.ok) throw new Error('expected the payload to be rejected');
	return result.reason;
};

describe('parsePublicContent', () => {
	it('accepts a valid version 1 payload unchanged', () => {
		const raw = payload();
		expect(ok(JSON.parse(JSON.stringify(raw)))).toEqual(raw);
	});

	it('accepts empty collections and a null settings', () => {
		const content = ok(payload({ events: [], faqs: [], pillars: [], socials: [], board: [], settings: null }));
		expect(content.settings).toBeNull();
		expect(content.events).toEqual([]);
	});

	it('rejects non-objects', () => {
		for (const raw of [null, undefined, 'x', 42, [], true]) expect(reason(raw)).toMatch(/object/);
	});

	it('rejects unknown and missing versions', () => {
		expect(reason({ ...payload(), version: 2 })).toMatch(/version/);
		expect(reason({ ...payload(), version: '1' })).toMatch(/version/);
		const { version: _version, ...withoutVersion } = payload();
		expect(reason(withoutVersion)).toMatch(/version/);
	});

	it('rejects a payload whose collections are not arrays', () => {
		for (const key of ['events', 'faqs', 'pillars', 'socials', 'board'] as const) {
			expect(reason({ ...payload(), [key]: {} })).toContain(key);
		}
	});

	it('rejects a missing or malformed settings', () => {
		const { settings: _settings, ...withoutSettings } = payload();
		expect(reason(withoutSettings)).toContain('settings');
		expect(reason({ ...payload(), settings: { tagline: 'x' } })).toContain('settings');
	});

	it('rejects malformed events', () => {
		const event = payload().events[0];
		expect(reason(payload({ events: [{ ...event, date: '12/11/2026' }] }))).toContain('date');
		expect(reason(payload({ events: [{ ...event, date: '2026-02-31' }] }))).toContain('date');
		expect(reason(payload({ events: [{ ...event, type: 'fiesta' as never }] }))).toContain('type');
		expect(reason(payload({ events: [{ ...event, featured: 'yes' as never }] }))).toContain('featured');
		expect(reason(payload({ events: [{ ...event, highlights: [1] as never }] }))).toContain('highlights');
		expect(reason(payload({ events: [{ ...event, slug: '' }] }))).toContain('slug');
	});

	describe('datePrecision (month-only dates, additive to version 1)', () => {
		const event = payload().events[0];
		const { datePrecision: _datePrecision, ...legacy } = event;

		it('defaults to "day" when the payload does not carry it (an older admin stays valid)', () => {
			expect(ok(payload({ events: [legacy as never] })).events[0].datePrecision).toBe('day');
		});

		it('accepts "day" and "month"', () => {
			expect(ok(payload({ events: [{ ...event, datePrecision: 'month' }] })).events[0].datePrecision).toBe('month');
			expect(ok(payload({ events: [{ ...event, datePrecision: 'day' }] })).events[0].datePrecision).toBe('day');
		});

		it('rejects any other value, null included', () => {
			for (const datePrecision of ['year', 'Month', 'DAY', '', null, 1, true]) {
				expect(
					reason(payload({ events: [{ ...event, datePrecision: datePrecision as never }] })),
					String(datePrecision),
				).toContain('datePrecision');
			}
		});

		it('keeps a month-precision event without a date valid (the chip is simply omitted)', () => {
			expect(ok(payload({ events: [{ ...event, date: null, datePrecision: 'month' }] })).events[0]).toMatchObject({
				date: null,
				datePrecision: 'month',
			});
		});
	});

	it('accepts null optional event fields', () => {
		const event = payload().events[0];
		const nulls = {
			description: null,
			date: null,
			type: null,
			commitMessage: null,
			hora: null,
			lugar: null,
			para: null,
			linkUrl: null,
			linkLabel: null,
		};
		expect(ok(payload({ events: [{ ...event, ...nulls, photos: [] }] })).events[0]).toMatchObject(nulls);
	});

	it('only lets https URLs through into links', () => {
		const event = payload().events[0];
		for (const linkUrl of ['javascript:alert(1)', 'http://example.com/inscripcion']) {
			expect(reason(payload({ events: [{ ...event, linkUrl }] }))).toContain('linkUrl');
		}
		const social = payload().socials[0];
		for (const url of ['javascript:alert(1)', 'http://www.instagram.com/aso/']) {
			expect(reason(payload({ socials: [{ ...social, url }] }))).toContain('url');
		}
		expect(ok(payload({ events: [{ ...event, linkUrl: 'https://example.com/ok' }] })).events[0].linkUrl).toBe(
			'https://example.com/ok',
		);
	});

	it('requires a Cloudinary image URL and positive integer dimensions', () => {
		const event = payload().events[0];
		expect(
			reason(
				payload({
					events: [{ ...event, photos: [image({ url: 'http://res.cloudinary.com/demo/image/upload/v1/a.jpg' })] }],
				}),
			),
		).toContain('url');
		expect(reason(payload({ events: [{ ...event, photos: [image({ url: '/src/assets/team/a.jpg' })] }] }))).toContain(
			'url',
		);
		expect(reason(payload({ events: [{ ...event, photos: [image({ width: 0 })] }] }))).toContain('width');
		expect(reason(payload({ events: [{ ...event, photos: [image({ height: 10.5 })] }] }))).toContain('height');
		expect(reason(payload({ board: [{ name: 'A', role: 'B', photo: image({ alt: undefined as never }) }] }))).toContain(
			'alt',
		);
	});

	it('rejects an image that is not an image upload on res.cloudinary.com, wherever it appears', () => {
		const event = payload().events[0];
		const member = payload().board[0];
		const pillar = payload().pillars[0];
		for (const url of [
			'https://images.example.com/image/upload/v1/a.jpg',
			'https://res.cloudinary.com.evil.test/demo/image/upload/v1/a.jpg',
			'https://evil.test/res.cloudinary.com/demo/image/upload/v1/a.jpg',
			'https://res.cloudinary.com/demo/video/upload/v1/dog.mp4',
			'https://res.cloudinary.com/demo/raw/upload/v1/a.json',
			'https://res.cloudinary.com/demo/image/fetch/https://evil.test/a.jpg',
			'https://res.cloudinary.com/demo/image/upload/',
			'https://res.cloudinary.com//image/upload/v1/a.jpg',
			'https://res.cloudinary.com/demo/image/upload/v1/a b.jpg',
		]) {
			expect(reason(payload({ events: [{ ...event, photos: [image({ url })] }] })), url).toContain('url');
			expect(reason(payload({ board: [{ ...member, photo: image({ url }) }] })), url).toContain('url');
			expect(reason(payload({ pillars: [{ ...pillar, image: image({ url }) }] })), url).toContain('url');
		}
	});

	it('accepts local asset references only when allowLocalImages is set (the committed fallback)', () => {
		const local = payload({ board: [{ name: 'A', role: 'B', photo: image({ url: '/src/assets/team/a.jpg' }) }] });
		expect(reason(local)).toContain('url');
		expect(ok(local, { allowLocalImages: true }).board[0].photo.url).toBe('/src/assets/team/a.jpg');
		const traversal = payload({ board: [{ name: 'A', role: 'B', photo: image({ url: '/src/assets/../../.env' }) }] });
		expect(reason(traversal, { allowLocalImages: true })).toContain('url');
		const foreign = payload({ board: [{ name: 'A', role: 'B', photo: image({ url: 'https://evil.test/a.jpg' }) }] });
		expect(reason(foreign, { allowLocalImages: true })).toContain('url');
	});

	it('rejects stored Cloudinary transformations: only an optional version and comma-free segments follow /image/upload/', () => {
		const event = payload().events[0];
		const photoWith = (url: string) => payload({ events: [{ ...event, photos: [image({ url })] }] });
		for (const url of [
			'https://res.cloudinary.com/demo/image/upload/c_fill,w_100/v99/a.jpg',
			'https://res.cloudinary.com/demo/image/upload/v1/c_fill,w_100/a.jpg',
			'https://res.cloudinary.com/demo/image/upload/w_100,h_50/a.jpg',
		]) {
			expect(reason(photoWith(url)), url).toContain('url');
		}
		for (const url of [
			'https://res.cloudinary.com/demo/image/upload/v1712345/aso/eventos/foto%20uno.jpg',
			'https://res.cloudinary.com/demo/image/upload/aso/a.jpg',
			'https://res.cloudinary.com/demo/image/upload/v1/a.jpg',
		]) {
			expect(ok(photoWith(url)).events[0].photos[0].url, url).toBe(url);
		}
	});

	it('rejects dot segments, encoded dots, query strings and fragments anywhere in the image path', () => {
		const event = payload().events[0];
		const photoWith = (url: string) => payload({ events: [{ ...event, photos: [image({ url })] }] });
		const base = 'https://res.cloudinary.com/demo/image/upload/';
		const cases: Record<string, string[]> = {
			'..': [`${base}v1/../../video/upload/a.mp4`, `${base}../other/image/upload/a.jpg`, `${base}v1/a/..`],
			'%2e': [`${base}v1/%2e%2e/a.jpg`, `${base}v1/%2e./a.jpg`, `${base}v1/.%2e/a.jpg`],
			'%2E': [`${base}v1/%2E%2E/a.jpg`, `${base}v1/a/%2E%2e/b.jpg`],
			'?': [`${base}v1/a.jpg?x=1`, `${base}v1/a?b/c.jpg`],
			'#': [`${base}v1/a.jpg#frag`, `${base}v1/a#b/c.jpg`],
		};
		for (const [label, urls] of Object.entries(cases)) {
			for (const url of urls) expect(reason(photoWith(url)), `${label} ${url}`).toContain('url');
		}
	});

	it('caps image width and height at 10000 positive integers', () => {
		const event = payload().events[0];
		const photoWith = (overrides: Parameters<typeof image>[0]) =>
			payload({ events: [{ ...event, photos: [image(overrides)] }] });
		for (const value of [1e21, 10001, Infinity, NaN, 1.5, 0, -5]) {
			expect(reason(photoWith({ width: value })), `width ${value}`).toContain('width');
			expect(reason(photoWith({ height: value })), `height ${value}`).toContain('height');
		}
		const photo = ok(photoWith({ width: 10000, height: 10000 })).events[0].photos[0];
		expect([photo.width, photo.height]).toEqual([10000, 10000]);
	});

	describe('size caps (a hostile or buggy payload cannot bloat the page)', () => {
		const long = (length: number) => 'x'.repeat(length);
		const event = payload().events[0];

		it('rejects strings far beyond the admin limits', () => {
			expect(reason(payload({ faqs: [{ question: '¿Q?', answer: long(5_000_000) }] }))).toContain('answer');
			expect(reason(payload({ faqs: [{ question: long(1_000), answer: 'a' }] }))).toContain('question');
			expect(reason(payload({ events: [{ ...event, title: long(1_000) }] }))).toContain('title');
			expect(reason(payload({ events: [{ ...event, description: long(10_000) }] }))).toContain('description');
			expect(reason(payload({ events: [{ ...event, highlights: [long(1_000)] }] }))).toContain('highlights');
			expect(reason(payload({ events: [{ ...event, photos: [image({ alt: long(5_000) })] }] }))).toContain('alt');
			expect(reason(payload({ board: [{ name: long(1_000), role: 'r', photo: image() }] }))).toContain('name');
			expect(reason(payload({ socials: [{ ...payload().socials[0], handle: long(1_000) }] }))).toContain('handle');
			expect(reason(payload({ settings: { tagline: 't', description: 'd', about: long(10_000) } }))).toContain('about');
			expect(reason(payload({ events: [{ ...event, linkUrl: `https://example.com/${long(5_000)}` }] }))).toContain(
				'linkUrl',
			);
		});

		it('still accepts the admin maximums', () => {
			const content = ok(
				payload({
					faqs: [{ question: long(200), answer: long(1000) }],
					events: [
						{
							...event,
							title: long(120),
							description: long(600),
							highlights: Array(8).fill(long(80)),
							photos: Array(12).fill(image({ alt: long(200) })),
						},
					],
					settings: { tagline: long(120), description: long(300), about: long(600) },
				}),
			);
			expect(content.faqs[0].answer).toHaveLength(1000);
			expect(content.events[0].photos).toHaveLength(12);
		});

		it('rejects arrays beyond the caps', () => {
			expect(reason(payload({ events: Array(101).fill(event) }))).toContain('events');
			expect(reason(payload({ events: [{ ...event, photos: Array(13).fill(image()) }] }))).toContain('photos');
			expect(reason(payload({ events: [{ ...event, highlights: Array(17).fill('h') }] }))).toContain('highlights');
			expect(reason(payload({ faqs: Array(51).fill(payload().faqs[0]) }))).toContain('faqs');
			expect(reason(payload({ pillars: Array(51).fill(payload().pillars[0]) }))).toContain('pillars');
			expect(reason(payload({ socials: Array(51).fill(payload().socials[0]) }))).toContain('socials');
			expect(reason(payload({ board: Array(51).fill(payload().board[0]) }))).toContain('board');
		});

		it('accepts arrays at the caps', () => {
			expect(ok(payload({ events: Array(100).fill(event) })).events).toHaveLength(100);
			expect(ok(payload({ board: Array(50).fill(payload().board[0]) })).board).toHaveLength(50);
		});
	});

	it('accepts a pillar without an image', () => {
		const pillar = { word: 'APOYO', title: 'Acompañamos', text: 'Texto.', image: null };
		expect(ok(payload({ pillars: [pillar] })).pillars[0].image).toBeNull();
	});

	it('accepts an unknown social platform (the glyph falls back later)', () => {
		const social = { ...payload().socials[0], platform: 'mastodon' };
		expect(ok(payload({ socials: [social] })).socials[0].platform).toBe('mastodon');
	});

	describe('S4: board privacy', () => {
		it('drops every key of a board member except name, role and photo', () => {
			const member = {
				...payload().board[0],
				phone: '0999999999',
				email: 'a@b.c',
				age: 22,
				instagram: '@ana',
				ciclo: 5,
				isPublished: true,
			};
			const content = ok({ ...payload(), board: [member] });
			expect(Object.keys(content.board[0]).sort()).toEqual(['name', 'photo', 'role']);
			expect(JSON.stringify(content.board)).not.toMatch(/0999999999|a@b\.c|@ana/);
		});

		it('drops extra keys inside the photo too', () => {
			const member = { ...payload().board[0], photo: { ...image(), publicId: 'aso/secret', exif: { gps: '1,2' } } };
			const content = ok({ ...payload(), board: [member] });
			expect(Object.keys(content.board[0].photo).sort()).toEqual(['alt', 'height', 'url', 'width']);
		});
	});

	it('drops unknown keys everywhere and never invents or filters entries', () => {
		const raw = payload();
		const noisy = {
			...raw,
			debug: true,
			events: raw.events.map((event) => ({ ...event, isPublished: false, id: 'e1', sortOrder: 3 })),
			faqs: raw.faqs.map((faq) => ({ ...faq, isPublished: false })),
			pillars: raw.pillars.map((pillar) => ({ ...pillar, id: 'p1' })),
			socials: raw.socials.map((social) => ({ ...social, id: 's1' })),
			settings: { ...raw.settings, id: 'site' },
		};
		const content = ok(noisy);
		expect(content).toEqual(raw);
		expect(content.events).toHaveLength(raw.events.length);
		expect(content.faqs).toHaveLength(raw.faqs.length);
	});
});

describe('parsePublicContent: news', () => {
	const cover = newsItem().cover!;

	it('reads a payload without `news` as an empty list (an admin that does not send it yet)', () => {
		const { news: _news, ...withoutNews } = payload();
		expect(ok(withoutNews).news).toEqual([]);
	});

	it('accepts valid items, with and without a cover, and keeps their order', () => {
		const news = [newsItem(), newsItem({ slug: 'sin-portada', cover: null, publishedAt: '2026-09-01' })];
		expect(ok(JSON.parse(JSON.stringify(payload({ news }))))).toEqual(payload({ news }));
	});

	it('rejects `news` that is not an array, including null', () => {
		expect(reason({ ...payload(), news: {} })).toContain('news');
		expect(reason({ ...payload(), news: null })).toContain('news');
	});

	it('drops keys outside the documented shape', () => {
		const raw = { ...newsItem(), id: 7, draft: true, author: 'x', cover: { ...cover, publicId: 'secret' } };
		const [item] = ok(payload({ news: [raw as never] })).news;
		expect(Object.keys(item).sort()).toEqual(['body', 'cover', 'publishedAt', 'slug', 'summary', 'title']);
		expect(Object.keys(item.cover!).sort()).toEqual(['alt', 'height', 'url', 'width']);
	});

	it('requires a URL-safe, unique slug', () => {
		for (const slug of ['', 'Con Mayúsculas', 'a/b', '..', 'a_b', '-x', 'x-', 'a--b', 'x'.repeat(101)]) {
			expect(reason(payload({ news: [newsItem({ slug })] })), slug).toContain('slug');
		}
		expect(reason(payload({ news: [newsItem(), newsItem({ title: 'Otro' })] }))).toContain('duplicate');
	});

	it('enforces the contract caps on text', () => {
		expect(
			ok(payload({ news: [newsItem({ title: 'x'.repeat(120), summary: 'x'.repeat(280), body: 'x'.repeat(10_000) })] }))
				.news,
		).toHaveLength(1);
		expect(reason(payload({ news: [newsItem({ title: 'x'.repeat(121) })] }))).toContain('title');
		expect(reason(payload({ news: [newsItem({ summary: 'x'.repeat(281) })] }))).toContain('summary');
		expect(reason(payload({ news: [newsItem({ body: 'x'.repeat(10_001) })] }))).toContain('body');
		for (const key of ['title', 'summary', 'body'] as const) {
			expect(reason(payload({ news: [newsItem({ [key]: '  ' })] })), key).toContain(key);
			expect(reason(payload({ news: [newsItem({ [key]: 5 as never })] })), key).toContain(key);
		}
	});

	it('caps the number of items', () => {
		const many = (count: number) => Array.from({ length: count }, (_, index) => newsItem({ slug: `n-${index}` }));
		expect(ok(payload({ news: many(200) })).news).toHaveLength(200);
		expect(reason(payload({ news: many(201) }))).toContain('news');
	});

	it('requires publishedAt to be a real calendar date', () => {
		for (const publishedAt of ['20/10/2026', '2026-02-31', '2026-10-20T10:00:00Z', '', null, 20261020]) {
			expect(
				reason(payload({ news: [newsItem({ publishedAt: publishedAt as never })] })),
				String(publishedAt),
			).toContain('publishedAt');
		}
	});

	it('restricts the cover exactly like the other admin images', () => {
		const bad = [
			'http://res.cloudinary.com/demo/image/upload/v1/a.jpg',
			'https://evil.example/image/upload/v1/a.jpg',
			'https://res.cloudinary.com/demo/video/upload/v1/a.mp4',
			'https://res.cloudinary.com/demo/image/upload/c_fill,w_100/v1/a.jpg',
			'https://res.cloudinary.com/demo/image/upload/v1/../../video/upload/a.jpg',
			'https://res.cloudinary.com/demo/image/upload/v1/a.jpg?x=1',
			'/src/assets/team/ana.jpg',
			'javascript:alert(1)',
		];
		for (const url of bad)
			expect(reason(payload({ news: [newsItem({ cover: { ...cover, url } })] })), url).toContain('cover.url');
	});

	it('accepts bundled covers only on the fallback path', () => {
		const local = newsItem({ cover: { ...cover, url: '/src/assets/team/ana.jpg' } });
		expect(ok(payload({ news: [local] }), { allowLocalImages: true }).news).toHaveLength(1);
	});

	it('bounds the cover dimensions and requires its alt text', () => {
		for (const bad of [
			{ width: 0 },
			{ width: 10_001 },
			{ height: 1.5 },
			{ height: '800' },
			{ alt: '' },
			{ alt: 'x'.repeat(201) },
			{ alt: undefined },
		]) {
			expect(
				reason(payload({ news: [newsItem({ cover: { ...cover, ...bad } as never })] })),
				JSON.stringify(bad),
			).toContain('cover');
		}
	});

	it('treats an invalid item as an invalid payload, so the build falls back', () => {
		const good = newsItem({ slug: 'bueno' });
		expect(reason(payload({ news: [good, newsItem({ slug: 'malo', summary: '' })] }))).toContain('news[1].summary');
	});
});

describe('parsePublicContent: FAQ commands and free commands', () => {
	const faq = (command: unknown) => ({ question: '¿Q?', answer: 'A', command }) as never;
	const free = (overrides: Record<string, unknown> = {}) =>
		({
			id: 'c1',
			command: 'whoami',
			description: 'Quiénes somos',
			output: 'Somos la ASO.\nTe esperamos.',
			...overrides,
		}) as never;

	it('reads a payload from an older admin, without either field, as having no commands', () => {
		const old = JSON.parse(JSON.stringify(payload()));
		for (const item of old.faqs) delete item.command;
		delete old.commands;
		const content = ok(old);
		expect(content.commands).toEqual([]);
		expect(content.faqs[0].command).toBeNull();
	});

	it('keeps a FAQ command and a null one', () => {
		const content = ok(payload({ faqs: [faq('quien-participa'), faq(null)] }));
		expect(content.faqs.map((item) => item.command)).toEqual(['quien-participa', null]);
	});

	it('keeps the free commands in order, multi-line output included', () => {
		const content = ok(payload({ commands: [free(), free({ id: 'c2', command: 'horario' })] }));
		expect(content.commands.map((item) => item.command)).toEqual(['whoami', 'horario']);
		expect(content.commands[0]).toEqual({
			id: 'c1',
			command: 'whoami',
			description: 'Quiénes somos',
			output: 'Somos la ASO.\nTe esperamos.',
		});
	});

	it('rejects a command name that breaks the format, in a FAQ and in a free command', () => {
		for (const bad of [
			'',
			'a',
			'Mayus',
			'1abc',
			'con espacio',
			'doble--guion',
			'-inicio',
			'fin-',
			'ñandú',
			'a'.repeat(29),
		]) {
			expect(reason(payload({ faqs: [faq(bad)] }))).toContain('faqs[0].command');
			expect(reason(payload({ commands: [free({ command: bad })] }))).toContain('commands[0].command');
		}
		expect(ok(payload({ commands: [free({ command: 'a'.repeat(28) })] })).commands).toHaveLength(1);
	});

	it('rejects a description over 80 characters and an output over 600', () => {
		expect(reason(payload({ commands: [free({ description: 'x'.repeat(81) })] }))).toContain('commands[0].description');
		expect(reason(payload({ commands: [free({ output: 'x'.repeat(601) })] }))).toContain('commands[0].output');
		expect(
			ok(payload({ commands: [free({ description: 'x'.repeat(80), output: 'x'.repeat(600) })] })).commands,
		).toHaveLength(1);
	});

	it('rejects a free command without output or description', () => {
		expect(reason(payload({ commands: [free({ output: '  ' })] }))).toContain('commands[0].output');
		expect(reason(payload({ commands: [free({ description: '' })] }))).toContain('commands[0].description');
	});

	it('drops keys of a free command that are not part of the contract', () => {
		const content = ok(payload({ commands: [free({ isPublished: true, position: 3 })] }));
		expect(Object.keys(content.commands[0]).sort()).toEqual(['command', 'description', 'id', 'output']);
	});
});
