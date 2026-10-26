// Preview build mode (S6). A normal build reads the admin's public content, which the admin already filters by publish
// window. A preview build instead asks `GET /api/public/preview` for drafts and scheduled content, server-side, with
// the token in a header. It never falls back: a preview that cannot be had is a failed build, not a quiet substitute.
// Pure apart from the injected fetch, so it is unit-tested; src/data/content.ts runs it once per build.
import { PUBLIC_CONTENT_VERSION, type PublicContent } from './types';
import { Unavailable, withDeadline, DEFAULT_TIMEOUT_MS } from './load';
import { parsePublicContent } from './validate';

export interface PreviewEnv {
	PREVIEW_BUILD?: string;
	PREVIEW_TOKEN?: string;
	ADMIN_PREVIEW_URL?: string;
}

export interface PreviewConfig {
	// Full URL of the admin's `GET /api/public/preview`.
	url: string;
	token: string;
}

// Anything that stops a preview build: a bad setting, a rejected token, a response that is not a preview.
// Messages never contain the token or a full URL.
export class PreviewBuildError extends Error {}

const truthy = (value: string | undefined) => ['1', 'true'].includes(value?.trim().toLowerCase() ?? '');

// Preview is opt-in with its own switch. A token alone never changes a build: a leftover PREVIEW_TOKEN in a production
// project must not turn the public site into a draft viewer.
export const isPreviewBuild = (env: PreviewEnv) => truthy(env.PREVIEW_BUILD);

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

// Reads the preview settings, or `undefined` for a normal build. Throws PreviewBuildError for a half-configured preview.
export function readPreviewConfig(env: PreviewEnv): PreviewConfig | undefined {
	if (!isPreviewBuild(env)) return undefined;
	const token = env.PREVIEW_TOKEN?.trim();
	if (!token)
		throw new PreviewBuildError('PREVIEW_BUILD is on but PREVIEW_TOKEN is not set (mint one at /admin/vista-previa).');
	const target = env.ADMIN_PREVIEW_URL?.trim();
	if (!target) throw new PreviewBuildError('PREVIEW_BUILD is on but ADMIN_PREVIEW_URL is not set.');
	let url: URL;
	try {
		url = new URL(target);
	} catch {
		throw new PreviewBuildError('ADMIN_PREVIEW_URL is not a valid URL.');
	}
	// The token travels in a header, so it only ever goes over TLS (or to a local admin while developing).
	if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOCAL_HOSTS.includes(url.hostname)))
		throw new PreviewBuildError('ADMIN_PREVIEW_URL must be https (http is only allowed for localhost).');
	return { url: url.href, token };
}

export interface PreviewLoadOptions extends PreviewConfig {
	fetch?: typeof fetch;
	timeoutMs?: number;
}

const readBody = async (response: Response): Promise<unknown> => {
	const body = await response.text();
	try {
		return JSON.parse(body) as unknown;
	} catch {
		throw new PreviewBuildError('the preview response is not valid JSON.');
	}
};

// Fetches and validates the preview document. Throws PreviewBuildError on every failure; resolves only with a response
// the admin marked `preview: true`.
export async function loadPreviewContent(
	options: PreviewLoadOptions,
): Promise<{ source: 'preview'; content: PublicContent }> {
	const { url, token, fetch: doFetch = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

	let raw: unknown;
	try {
		raw = await withDeadline(async (signal) => {
			const response = await doFetch(url, {
				signal,
				// Never reuse a cached copy, and never follow a redirect: a custom header would travel with it.
				cache: 'no-store',
				redirect: 'error',
				headers: { accept: 'application/json', 'x-preview-token': token },
			});
			if (response.status === 401)
				throw new PreviewBuildError(
					'the admin rejected the preview token (HTTP 401): it is invalid or expired. Mint a new one at /admin/vista-previa and update PREVIEW_TOKEN.',
				);
			if (response.status !== 200)
				throw new PreviewBuildError(`the admin answered HTTP ${response.status} for the preview.`);
			return readBody(response);
		}, timeoutMs);
	} catch (error) {
		if (error instanceof PreviewBuildError) throw error;
		// Network failures and timeouts: name the kind only, since an error text can carry the URL.
		throw new PreviewBuildError(
			error instanceof Unavailable
				? `the preview request failed: ${error.message}.`
				: 'the preview request failed (network error).',
		);
	}

	const root = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
	if (root.preview !== true)
		throw new PreviewBuildError('the response is not marked `preview: true`; refusing to build a preview from it.');
	if (root.schemaVersion !== undefined && root.schemaVersion !== PUBLIC_CONTENT_VERSION)
		throw new PreviewBuildError(
			`unsupported schemaVersion ${JSON.stringify(root.schemaVersion)} (this landing reads version ${PUBLIC_CONTENT_VERSION}).`,
		);

	const parsed = parsePublicContent(raw);
	if (!parsed.ok) throw new PreviewBuildError(`the preview response was rejected (${parsed.reason}).`);
	return { source: 'preview', content: parsed.content };
}
