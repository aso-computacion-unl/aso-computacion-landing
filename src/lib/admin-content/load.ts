import type { PublicContent } from './types';
import { parsePublicContent } from './validate';

export interface LoadOptions {
	// Full URL of the admin's `/api/public/content`. Unset or blank means "no admin": use the fallback.
	url: string | undefined;
	// The parsed contents of src/data/fallback.json (a snapshot in the same shape).
	fallback: unknown;
	fetch?: typeof fetch;
	timeoutMs?: number;
	warn?: (message: string) => void;
}

export type LoadedContent =
	{ source: 'api'; content: PublicContent } | { source: 'fallback'; content: PublicContent; reason: string };

export const DEFAULT_TIMEOUT_MS = 10_000;

class Unavailable extends Error {}

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

// Runs `task` with an abort signal and a hard deadline. The race guarantees the deadline even when a fetch
// implementation ignores the signal.
async function withDeadline<T>(task: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			controller.abort();
			reject(new Unavailable(`request timed out after ${timeoutMs} ms`));
		}, timeoutMs);
	});
	const request = task(controller.signal);
	// If the deadline wins, the late request may still reject: keep that from surfacing as an unhandled rejection.
	request.catch(() => {});
	try {
		return await Promise.race([request, deadline]);
	} finally {
		clearTimeout(timer);
	}
}

const fetchJson = (url: string, doFetch: typeof fetch, timeoutMs: number): Promise<unknown> =>
	withDeadline(async (signal) => {
		const response = await doFetch(url, { signal, headers: { accept: 'application/json' } });
		if (response.status !== 200) throw new Unavailable(`the admin answered HTTP ${response.status}`);
		const body = await response.text();
		try {
			return JSON.parse(body) as unknown;
		} catch {
			throw new Unavailable('the response is not valid JSON');
		}
	}, timeoutMs);

// Resolves the content the landing is built from. It never throws because of the admin: any failure (unset URL,
// network, timeout, non-200, invalid JSON, invalid shape, unknown version) logs ONE warning and returns the committed
// fallback. It only throws if the committed fallback.json itself is invalid, which is a bug in this repo.
export async function loadPublicContent(options: LoadOptions): Promise<LoadedContent> {
	const { url, fallback, fetch: doFetch = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, warn = console.warn } = options;

	const useFallback = (reason: string): LoadedContent => {
		const parsed = parsePublicContent(fallback, { allowLocalImages: true });
		if (!parsed.ok) throw new Error(`src/data/fallback.json is invalid: ${parsed.reason}`);
		warn(`[admin-content] Using src/data/fallback.json: ${reason}`);
		return { source: 'fallback', content: parsed.content, reason };
	};

	const target = url?.trim();
	if (!target) return useFallback('ADMIN_CONTENT_URL is not set');
	try {
		new URL(target);
	} catch {
		return useFallback('ADMIN_CONTENT_URL is not a valid URL');
	}

	let raw: unknown;
	try {
		raw = await fetchJson(target, doFetch, timeoutMs);
	} catch (error) {
		return useFallback(describe(error));
	}

	const parsed = parsePublicContent(raw);
	if (!parsed.ok) return useFallback(`the response was rejected (${parsed.reason})`);
	return { source: 'api', content: parsed.content };
}
