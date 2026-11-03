import { describe, expect, it, vi } from 'vitest';
import {
	PreviewBuildError,
	assertPreviewAllowed,
	isPreviewBuild,
	loadPreviewContent,
	readPreviewConfig,
} from './preview';
import { newsItem, payload } from './test-fixtures';

const TOKEN = 'header.payload.s3cret-signature';
const URL_ = 'https://admin.example.test/api/public/preview?x=1';

const json = (body: unknown, status = 200) =>
	new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
const preview = (overrides: Record<string, unknown> = {}) => ({
	...payload(),
	schemaVersion: 1,
	preview: true,
	...overrides,
});

const load = (fetch: typeof globalThis.fetch, extra: { timeoutMs?: number } = {}) =>
	loadPreviewContent({ url: URL_, token: TOKEN, fetch, ...extra });
const failure = async (promise: Promise<unknown>) => {
	const error = await promise.then(
		() => undefined,
		(thrown: unknown) => thrown,
	);
	expect(error).toBeInstanceOf(PreviewBuildError);
	return (error as PreviewBuildError).message;
};

describe('assertPreviewAllowed (the public project never builds a preview)', () => {
	const on = { PREVIEW_BUILD: '1', PREVIEW_TOKEN: TOKEN, ADMIN_PREVIEW_URL: URL_ };
	const onCloudflare = (project: string) => ({
		CF_PAGES: '1',
		CF_PAGES_URL: `https://3f2a9c1b.${project}.pages.dev`,
	});

	it('refuses a preview build on the public Cloudflare Pages project', () => {
		const env = { ...on, ...onCloudflare('aso-computacion-landing'), PUBLIC_PAGES_PROJECT: 'aso-computacion-landing' };
		expect(() => assertPreviewAllowed(env)).toThrow(PreviewBuildError);
		expect(() => assertPreviewAllowed(env)).toThrow(/public Cloudflare Pages project/);
		// Case and padding do not turn the public project into another one, and the guard runs before anything else.
		const sloppy = { ...env, PUBLIC_PAGES_PROJECT: ' ASO-Computacion-Landing ' };
		expect(() => assertPreviewAllowed(sloppy)).toThrow(/public Cloudflare Pages project/);
		expect(() => readPreviewConfig(sloppy)).toThrow(/public Cloudflare Pages project/);
		// A branch alias of the public project is still the public project.
		const alias = { ...env, CF_PAGES_URL: 'https://feat-x.aso-computacion-landing.pages.dev' };
		expect(() => assertPreviewAllowed(alias)).toThrow(/public Cloudflare Pages project/);
	});

	it('fails closed on Cloudflare when PUBLIC_PAGES_PROJECT is not set', () => {
		const env = { ...on, ...onCloudflare('aso-computacion-preview') };
		for (const unset of [undefined, '', '  ']) {
			const withName = { ...env, PUBLIC_PAGES_PROJECT: unset };
			expect(() => assertPreviewAllowed(withName)).toThrow(/PUBLIC_PAGES_PROJECT/);
			expect(() => readPreviewConfig(withName)).toThrow(/PUBLIC_PAGES_PROJECT/);
		}
		// Same when Cloudflare does not say which project this is: it cannot be told apart from the public one.
		const named = { ...on, CF_PAGES: '1', PUBLIC_PAGES_PROJECT: 'aso-computacion-landing' };
		for (const url of [undefined, '', 'not a url', 'https://example.com']) {
			expect(() => assertPreviewAllowed({ ...named, CF_PAGES_URL: url })).toThrow(/CF_PAGES_URL/);
		}
	});

	it('allows a preview build on a separate Cloudflare Pages project', () => {
		const env = { ...on, ...onCloudflare('aso-computacion-preview'), PUBLIC_PAGES_PROJECT: 'aso-computacion-landing' };
		expect(() => assertPreviewAllowed(env)).not.toThrow();
		expect(readPreviewConfig(env)).toEqual({ url: URL_, token: TOKEN });
		// A project whose name merely starts with the public one is another project.
		const prefixed = { ...env, ...onCloudflare('aso-computacion-landing-preview') };
		expect(() => assertPreviewAllowed(prefixed)).not.toThrow();
	});

	it('allows a preview build outside Cloudflare Pages, with or without the name', () => {
		expect(() => assertPreviewAllowed(on)).not.toThrow();
		expect(() => assertPreviewAllowed({ ...on, PUBLIC_PAGES_PROJECT: 'aso-computacion-landing' })).not.toThrow();
		expect(() =>
			assertPreviewAllowed({ ...on, CF_PAGES: '0', CF_PAGES_URL: 'https://x.aso-computacion-landing.pages.dev' }),
		).not.toThrow();
		expect(readPreviewConfig(on)).toEqual({ url: URL_, token: TOKEN });
	});

	it('leaves a normal build alone, even on the public project or with no name', () => {
		const publicProject = {
			...onCloudflare('aso-computacion-landing'),
			PUBLIC_PAGES_PROJECT: 'aso-computacion-landing',
		};
		for (const env of [
			publicProject,
			onCloudflare('aso-computacion-landing'),
			{ PREVIEW_BUILD: '0', ...publicProject },
		]) {
			expect(() => assertPreviewAllowed(env)).not.toThrow();
			expect(readPreviewConfig(env)).toBeUndefined();
		}
	});
});

describe('isPreviewBuild / readPreviewConfig', () => {
	const on = { PREVIEW_BUILD: '1', PREVIEW_TOKEN: TOKEN, ADMIN_PREVIEW_URL: URL_ };

	it('is a normal build unless PREVIEW_BUILD is switched on, whatever else is set', () => {
		for (const env of [
			{},
			{ PREVIEW_TOKEN: TOKEN, ADMIN_PREVIEW_URL: URL_ },
			{ ...on, PREVIEW_BUILD: '0' },
			{ ...on, PREVIEW_BUILD: '' },
		]) {
			expect(isPreviewBuild(env)).toBe(false);
			expect(readPreviewConfig(env)).toBeUndefined();
		}
	});

	it('accepts 1 and true, and returns the trimmed settings', () => {
		for (const flag of ['1', 'true', ' TRUE ']) expect(isPreviewBuild({ ...on, PREVIEW_BUILD: flag })).toBe(true);
		expect(readPreviewConfig({ ...on, PREVIEW_TOKEN: `  ${TOKEN}\n`, ADMIN_PREVIEW_URL: ` ${URL_} ` })).toEqual({
			url: URL_,
			token: TOKEN,
		});
	});

	it('stops a half-configured preview instead of falling back to a normal build', () => {
		expect(() => readPreviewConfig({ ...on, PREVIEW_TOKEN: '  ' })).toThrow(/PREVIEW_TOKEN/);
		expect(() => readPreviewConfig({ ...on, PREVIEW_TOKEN: undefined })).toThrow(PreviewBuildError);
		expect(() => readPreviewConfig({ ...on, ADMIN_PREVIEW_URL: undefined })).toThrow(/ADMIN_PREVIEW_URL/);
		expect(() => readPreviewConfig({ ...on, ADMIN_PREVIEW_URL: 'not a url' })).toThrow(/valid URL/);
	});

	it('sends the token only over https, or to a local admin', () => {
		expect(() =>
			readPreviewConfig({ ...on, ADMIN_PREVIEW_URL: 'http://admin.example.test/api/public/preview' }),
		).toThrow(/https/);
		expect(() => readPreviewConfig({ ...on, ADMIN_PREVIEW_URL: 'ftp://localhost/x' })).toThrow(/https/);
		for (const host of ['localhost:3000', '127.0.0.1:3000']) {
			expect(readPreviewConfig({ ...on, ADMIN_PREVIEW_URL: `http://${host}/api/public/preview` })?.url).toContain(host);
		}
	});

	it('never puts the token in an error message', () => {
		try {
			readPreviewConfig({ ...on, ADMIN_PREVIEW_URL: 'http://admin.example.test/' });
		} catch (error) {
			expect((error as Error).message).not.toContain(TOKEN);
		}
	});
});

describe('loadPreviewContent', () => {
	it('sends the token in the X-Preview-Token header only, uncached and without following redirects', async () => {
		const fetch = vi.fn(async () => json(preview()));
		await load(fetch);
		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe(URL_);
		expect(url).not.toContain(TOKEN);
		expect(new Headers(init.headers).get('x-preview-token')).toBe(TOKEN);
		expect(init.cache).toBe('no-store');
		expect(init.redirect).toBe('error');
	});

	it('returns a preview source with the document parsed like normal content', async () => {
		const news = [newsItem({ slug: 'borrador' })];
		const loaded = await load(async () => json(preview({ news })));
		expect(loaded.source).toBe('preview');
		expect(loaded.content.news.map((item) => item.slug)).toEqual(['borrador']);
		expect(loaded.content).not.toHaveProperty('preview');
	});

	it('stops the build on 401: the token is invalid or expired', async () => {
		const message = await failure(load(async () => json({ error: 'Invalid or expired preview token' }, 401)));
		expect(message).toMatch(/401/);
		expect(message).toMatch(/invalid or expired/);
		expect(message).not.toContain(TOKEN);
	});

	it('stops the build on any other non-200 answer, including a rate limit', async () => {
		for (const status of [403, 404, 429, 500, 503]) {
			expect(await failure(load(async () => json(preview(), status))), String(status)).toContain(`HTTP ${status}`);
		}
	});

	it('stops the build when the response is not marked preview: true', async () => {
		const { preview: _preview, ...unmarked } = preview();
		for (const body of [
			unmarked,
			preview({ preview: false }),
			preview({ preview: 'true' }),
			preview({ preview: 1 }),
			payload(),
		]) {
			expect(await failure(load(async () => json(body)))).toMatch(/preview: true/);
		}
		for (const body of [null, [], 'text', 42]) {
			expect(await failure(load(async () => json(JSON.stringify(body))))).toMatch(/preview: true/);
		}
	});

	it('stops the build on another schemaVersion, but reads a document without one', async () => {
		expect(await failure(load(async () => json(preview({ schemaVersion: 2 }))))).toMatch(/schemaVersion/);
		expect(await failure(load(async () => json(preview({ schemaVersion: '1' }))))).toMatch(/schemaVersion/);
		const { schemaVersion: _schemaVersion, ...old } = preview();
		expect((await load(async () => json(old))).source).toBe('preview');
	});

	it('stops the build on an invalid body or shape, naming the field', async () => {
		expect(await failure(load(async () => json('{not json')))).toMatch(/JSON/);
		expect(await failure(load(async () => json(preview({ version: 2 }))))).toMatch(/version/);
		expect(await failure(load(async () => json(preview({ events: {} }))))).toContain('events');
	});

	it('stops the build on a network failure or a timeout, without leaking the URL or the token', async () => {
		const refused = async () => {
			throw new TypeError(`fetch failed: ${URL_} ${TOKEN}`);
		};
		const message = await failure(load(refused));
		expect(message).toMatch(/network/);
		expect(message).not.toContain(TOKEN);
		expect(message).not.toContain('admin.example.test');

		const hang = (_url: unknown, init?: RequestInit) =>
			new Promise<Response>((_resolve, reject) =>
				init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
			);
		expect(await failure(load(hang as typeof fetch, { timeoutMs: 20 }))).toMatch(/timed out/);
	});

	it('never falls back: the failure surfaces as a rejection, not as other content', async () => {
		await expect(load(async () => json({ error: 'x' }, 401))).rejects.toBeInstanceOf(PreviewBuildError);
	});
});
