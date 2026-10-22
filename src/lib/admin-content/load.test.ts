import { describe, expect, it, vi } from 'vitest';
import { loadPublicContent } from './load';
import { payload } from './test-fixtures';

const URL_OK = 'https://admin.example.test/api/public/content';
const fallback = payload({ events: [], faqs: [], settings: null });
const api = payload();

const respond = (body: unknown, init: ResponseInit = { status: 200 }) =>
	vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), init));

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

	describe('remote image preflight (Astro fails the build on an unreachable remote image)', () => {
		const IMAGE = 'https://res.cloudinary.com/demo/image/upload/v1/aso/photo.jpg';

		// Answers the API URL with the payload and every image URL with `imageStatus` (or a custom handler).
		const router = (imageHandler: (url: string) => Response | Promise<Response> = () => new Response('img', { status: 200 })) =>
			vi.fn(async (url: string) => (url === URL_OK ? new Response(JSON.stringify(api), { status: 200 }) : imageHandler(url)));

		it('keeps the API content when every image answers 200, asking for each distinct image once', async () => {
			const fetchMock = router();
			const { run, warn } = setup({ fetch: fetchMock as unknown as typeof fetch });
			const result = await run();
			expect(result.source).toBe('api');
			expect(warn).not.toHaveBeenCalled();
			const imageCalls = fetchMock.mock.calls.filter(([url]) => url !== URL_OK);
			expect(imageCalls.length).toBeGreaterThan(0);
			expect(new Set(imageCalls.map(([url]) => url)).size).toBe(imageCalls.length);
		});

		it('falls back, with one warning naming the image, when an image is 404', async () => {
			const { run, warn } = setup({ fetch: router(() => new Response('nope', { status: 404 })) as unknown as typeof fetch });
			const result = await run();
			expect(result.source).toBe('fallback');
			expect(result.content).toEqual(fallback);
			expect(warn).toHaveBeenCalledTimes(1);
			expect(warn.mock.calls[0][0]).toContain(IMAGE);
			expect(warn.mock.calls[0][0]).toContain('404');
		});

		it('falls back when an image request fails at the network level', async () => {
			const { run, warn } = setup({ fetch: router(() => Promise.reject(new TypeError('socket hang up'))) as unknown as typeof fetch });
			expect((await run()).source).toBe('fallback');
			expect(warn).toHaveBeenCalledTimes(1);
			expect(warn.mock.calls[0][0]).toMatch(/socket hang up/);
		});

		it('falls back when an image request outlives the timeout', async () => {
			const { run, warn } = setup({ fetch: router(() => new Promise<Response>(() => {})) as unknown as typeof fetch, timeoutMs: 20 });
			expect((await run()).source).toBe('fallback');
			expect(warn.mock.calls[0][0]).toMatch(/timed out/);
		});

		it('does not touch the network for images when the content has none', async () => {
			const bare = payload({ events: [], pillars: [], board: [] });
			const fetchMock = vi.fn(async () => new Response(JSON.stringify(bare), { status: 200 }));
			const result = await setup({ fetch: fetchMock as unknown as typeof fetch }).run();
			expect(result.source).toBe('api');
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});

		it('never probes images on the fallback path (they are bundled)', async () => {
			const fetchMock = router();
			await setup({ url: undefined, fetch: fetchMock as unknown as typeof fetch }).run();
			expect(fetchMock).not.toHaveBeenCalled();
		});
	});
});
