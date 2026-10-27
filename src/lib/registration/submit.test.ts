import { describe, expect, it, vi } from 'vitest';
import { submitRegistration } from './submit';

const ENDPOINT = 'https://admin.example.test/api/public/events/taller-de-git/registrations';
const payload = {
	name: 'Ana Mora',
	email: 'ana@unl.edu.ec',
	career: 'Computación',
	semester: 5,
	turnstileToken: 'tok',
};

const answer = (status: number, body: unknown, headers: Record<string, string> = {}) =>
	vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers }));

describe('submitRegistration', () => {
	it('POSTs the payload as JSON, without credentials, and returns the classified answer', async () => {
		const doFetch = answer(201, { ok: true });
		expect(await submitRegistration(ENDPOINT, payload, doFetch)).toEqual({ code: 'registered' });
		expect(doFetch).toHaveBeenCalledTimes(1);
		const [url, init] = doFetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe(ENDPOINT);
		expect(init.method).toBe('POST');
		expect(init.credentials).toBe('omit');
		expect(new Headers(init.headers).get('content-type')).toBe('application/json');
		expect(JSON.parse(init.body as string)).toEqual(payload);
	});

	it('returns each refusal of the endpoint', async () => {
		const cases: [number, unknown, string][] = [
			[409, { error: 'full' }, 'full'],
			[409, { error: 'closed' }, 'closed'],
			[409, { error: 'duplicate' }, 'duplicate'],
			[400, { error: 'captcha' }, 'captcha'],
			[404, { error: 'not_found' }, 'not_found'],
			[429, { error: 'rate_limited' }, 'rate_limited'],
			[503, { error: 'unavailable' }, 'unavailable'],
		];
		for (const [status, body, code] of cases) {
			expect((await submitRegistration(ENDPOINT, payload, answer(status, body))).code, code).toBe(code);
		}
		expect(
			await submitRegistration(ENDPOINT, payload, answer(400, { error: 'validation', field: 'semester' })),
		).toEqual({
			code: 'validation',
			field: 'semester',
		});
	});

	it('survives an answer that is not JSON (a proxy error page)', async () => {
		expect(await submitRegistration(ENDPOINT, payload, answer(502, '<html>Bad gateway</html>'))).toEqual({
			code: 'unavailable',
		});
		expect(await submitRegistration(ENDPOINT, payload, answer(201, 'ok'))).toEqual({ code: 'registered' });
	});

	it('reports a network failure (offline, CORS) instead of throwing', async () => {
		const doFetch = vi.fn(async () => {
			throw new TypeError('Failed to fetch');
		});
		expect(await submitRegistration(ENDPOINT, payload, doFetch)).toEqual({ code: 'network' });
	});

	it('gives up on an endpoint that never answers', async () => {
		const hang = vi.fn(
			(_url: string, init?: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
				}),
		);
		expect(await submitRegistration(ENDPOINT, payload, hang as unknown as typeof fetch, 20)).toEqual({
			code: 'network',
		});
	});
});
