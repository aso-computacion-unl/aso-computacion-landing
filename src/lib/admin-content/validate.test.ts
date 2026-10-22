import { describe, expect, it } from 'vitest';
import { image, payload } from './test-fixtures';
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

	it('accepts null optional event fields', () => {
		const event = payload().events[0];
		const nulls = { description: null, date: null, type: null, commitMessage: null, hora: null, lugar: null, para: null, linkUrl: null, linkLabel: null };
		expect(ok(payload({ events: [{ ...event, ...nulls, photos: [] }] })).events[0]).toMatchObject(nulls);
	});

	it('only lets http(s) URLs through into links', () => {
		const event = payload().events[0];
		expect(reason(payload({ events: [{ ...event, linkUrl: 'javascript:alert(1)' }] }))).toContain('linkUrl');
		const social = payload().socials[0];
		expect(reason(payload({ socials: [{ ...social, url: 'javascript:alert(1)' }] }))).toContain('url');
	});

	it('requires https for image URLs and positive integer dimensions', () => {
		const event = payload().events[0];
		expect(reason(payload({ events: [{ ...event, photos: [image({ url: 'http://x.test/a.jpg' })] }] }))).toContain('url');
		expect(reason(payload({ events: [{ ...event, photos: [image({ url: '/src/assets/team/a.jpg' })] }] }))).toContain('url');
		expect(reason(payload({ events: [{ ...event, photos: [image({ width: 0 })] }] }))).toContain('width');
		expect(reason(payload({ events: [{ ...event, photos: [image({ height: 10.5 })] }] }))).toContain('height');
		expect(reason(payload({ board: [{ name: 'A', role: 'B', photo: image({ alt: undefined as never }) }] }))).toContain('alt');
	});

	it('accepts local asset references only when allowLocalImages is set (the committed fallback)', () => {
		const local = payload({ board: [{ name: 'A', role: 'B', photo: image({ url: '/src/assets/team/a.jpg' }) }] });
		expect(reason(local)).toContain('url');
		expect(ok(local, { allowLocalImages: true }).board[0].photo.url).toBe('/src/assets/team/a.jpg');
		const traversal = payload({ board: [{ name: 'A', role: 'B', photo: image({ url: '/src/assets/../../.env' }) }] });
		expect(reason(traversal, { allowLocalImages: true })).toContain('url');
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
			const member = { ...payload().board[0], phone: '0999999999', email: 'a@b.c', age: 22, instagram: '@ana', ciclo: 5, isPublished: true };
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
