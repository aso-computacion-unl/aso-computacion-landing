import { describe, expect, it, vi } from 'vitest';
import { loadPublicContent } from './load';
import { newsItem, payload } from './test-fixtures';

const URL_OK = 'https://admin.example.test/api/public/content';
const fallback = payload({ events: [], faqs: [], settings: null });
const api = payload();

const respond = (body: unknown, init: ResponseInit = { status: 200 }) =>
	vi.fn<typeof fetch>(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), init));

const setup = (overrides: Partial<Parameters<typeof loadPublicContent>[0]> = {}) => {
	const warn = vi.fn();
	const fetchMock = respond(api);
	const run = () => loadPublicContent({ url: URL_OK, fallback, fetch: fetchMock as unknown as typeof fetch, warn, timeoutMs: 200, ...overrides });
	return { warn, fetchMock, run };
};

describe('loadPublicContent', () => {
	it('returns the API content when the fetch and the shape are fine, without warning', async () => {
		const { run, warn, fetchMock } = setup();
		const result = await run();
		expect(result.source).toBe('api');
		expect(result.content).toEqual(api);
		expect(warn).not.toHaveBeenCalled();
		expect(fetchMock.mock.calls.filter(([url]) => url === URL_OK)).toHaveLength(1);
	});

	it('reads the news of the API, and a response without `news` (an admin that does not send it yet) as none', async () => {
		const news = [newsItem()];
		const withNews = await setup({ fetch: respond(payload({ news })) as unknown as typeof fetch }).run();
		expect(withNews).toMatchObject({ source: 'api', content: { news } });

		const { news: _news, ...legacy } = payload();
		const { run, warn } = setup({ fetch: respond(legacy) as unknown as typeof fetch });
		expect(await run()).toMatchObject({ source: 'api', content: { news: [] } });
		expect(warn).not.toHaveBeenCalled();
	});

	it('falls back, without failing, when a news item is invalid', async () => {
		const { run, warn } = setup({ fetch: respond(payload({ news: [newsItem({ publishedAt: 'ayer' })] })) as unknown as typeof fetch });
		expect(await run()).toMatchObject({ source: 'fallback', content: fallback });
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0][0]).toMatch(/news\[0\]\.publishedAt/);
	});

	it('uses the fallback and warns once when ADMIN_CONTENT_URL is unset or blank', async () => {
		for (const url of [undefined, '', '   ']) {
			const { run, warn, fetchMock } = setup({ url });
			const result = await run();
			expect(result.source).toBe('fallback');
			expect(result.content).toEqual(fallback);
			expect(fetchMock).not.toHaveBeenCalled();
			expect(warn).toHaveBeenCalledTimes(1);
			expect(warn.mock.calls[0][0]).toMatch(/ADMIN_CONTENT_URL/);
			expect(warn.mock.calls[0][0]).toMatch(/fallback\.json/);
		}
	});

	it('falls back on an invalid URL without calling fetch', async () => {
		const { run, warn, fetchMock } = setup({ url: 'not a url' });
		expect((await run()).source).toBe('fallback');
		expect(fetchMock).not.toHaveBeenCalled();
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it('falls back when the network request fails', async () => {
		const { run, warn } = setup({ fetch: vi.fn(async () => Promise.reject(new TypeError('fetch failed'))) as unknown as typeof fetch });
		const result = await run();
		expect(result.source).toBe('fallback');
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0][0]).toMatch(/fetch failed/);
	});

	it('falls back on any non-200 status, including a 200-range that is not 200', async () => {
		for (const status of [204, 301, 404, 429, 500, 503]) {
			const { run, warn } = setup({ fetch: respond('{}', { status }) as unknown as typeof fetch });
			expect((await run()).source).toBe('fallback');
			expect(warn).toHaveBeenCalledTimes(1);
			expect(warn.mock.calls[0][0]).toContain(String(status));
		}
	});

	it('falls back on invalid JSON', async () => {
		const { run, warn } = setup({ fetch: respond('<html>oops</html>') as unknown as typeof fetch });
		const result = await run();
		expect(result.source).toBe('fallback');
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0][0]).toMatch(/JSON/);
	});

	it('falls back on a valid JSON with an invalid shape', async () => {
		const { run, warn } = setup({ fetch: respond({ version: 1, events: 'nope' }) as unknown as typeof fetch });
		const result = await run();
		expect(result.source).toBe('fallback');
		expect(result.content).toEqual(fallback);
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it('falls back on an unknown version', async () => {
		const { run, warn } = setup({ fetch: respond({ ...api, version: 2 }) as unknown as typeof fetch });
		const result = await run();
		expect(result.source).toBe('fallback');
		expect(warn.mock.calls[0][0]).toMatch(/version/);
	});

	it('falls back when the request outlives the timeout, even if fetch ignores the abort signal', async () => {
		const never = vi.fn(() => new Promise<Response>(() => {}));
		const { run, warn } = setup({ fetch: never as unknown as typeof fetch, timeoutMs: 20 });
		const result = await run();
		expect(result.source).toBe('fallback');
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0][0]).toMatch(/timed out/);
	});

	it('aborts the request when the timeout fires', async () => {
		let signal: AbortSignal | undefined;
		const slow = vi.fn((_url: string, init?: RequestInit) => {
			signal = init?.signal ?? undefined;
			return new Promise<Response>(() => {});
		});
		const { run } = setup({ fetch: slow as unknown as typeof fetch, timeoutMs: 20 });
		await run();
		expect(signal?.aborted).toBe(true);
	});

	it('never leaks board keys beyond name, role and photo from the API', async () => {
		const leaky = { ...api, board: [{ ...api.board[0], phone: '0999999999', email: 'a@b.c' }] };
		const { run } = setup({ fetch: respond(leaky) as unknown as typeof fetch });
		const result = await run();
		expect(Object.keys(result.content.board[0]).sort()).toEqual(['name', 'photo', 'role']);
	});

	it('throws only when the committed fallback itself is invalid', async () => {
		const { run } = setup({ url: undefined, fallback: { version: 1 } });
		await expect(run()).rejects.toThrow(/fallback\.json/);
	});

	it('accepts local image references in the fallback but not in the API payload', async () => {
		const local = payload({ board: [{ ...api.board[0], photo: { ...api.board[0].photo, url: '/src/assets/team/a.jpg' } }] });
		const viaFallback = await setup({ url: undefined, fallback: local }).run();
		expect(viaFallback.content.board[0].photo.url).toBe('/src/assets/team/a.jpg');
		const viaApi = await setup({ fallback: local, fetch: respond(local) as unknown as typeof fetch }).run();
		expect(viaApi.source).toBe('fallback');
	});

	describe('images are never fetched at build time (they are delivered by Cloudinary)', () => {
		it('asks only for the API: no image request, however many images the payload has', async () => {
			const { run, warn, fetchMock } = setup();
			const result = await run();
			expect(result.source).toBe('api');
			expect(warn).not.toHaveBeenCalled();
			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(fetchMock.mock.calls[0][0]).toBe(URL_OK);
		});

		it('falls back when an image is not hosted on Cloudinary', async () => {
			const bad = payload({ board: [{ ...api.board[0], photo: { ...api.board[0].photo, url: 'https://images.example.com/image/upload/a.jpg' } }] });
			const { run, warn } = setup({ fetch: respond(bad) as unknown as typeof fetch });
			const result = await run();
			expect(result.source).toBe('fallback');
			expect(result.content).toEqual(fallback);
			expect(warn).toHaveBeenCalledTimes(1);
			expect(warn.mock.calls[0][0]).toContain('url');
		});

		it('falls back on a Cloudinary video URL (it answers 200 but is not an image)', async () => {
			const video = payload({ board: [{ ...api.board[0], photo: { ...api.board[0].photo, url: 'https://res.cloudinary.com/demo/video/upload/dog.mp4' } }] });
			const { run, warn } = setup({ fetch: respond(video) as unknown as typeof fetch });
			expect((await run()).source).toBe('fallback');
			expect(warn).toHaveBeenCalledTimes(1);
		});

		it('falls back on an http link and on an oversize payload', async () => {
			const http = payload({ events: [{ ...api.events[0], linkUrl: 'http://example.com/x' }] });
			const huge = payload({ faqs: [{ question: 'q', answer: 'x'.repeat(5_000_000) }] });
			for (const body of [http, huge]) {
				const { run, warn } = setup({ fetch: respond(body) as unknown as typeof fetch });
				expect((await run()).source).toBe('fallback');
				expect(warn).toHaveBeenCalledTimes(1);
			}
		});
	});
});
