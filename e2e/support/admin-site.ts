// Builds the landing against a mock admin and serves the result, so a spec can look at what a real build of real-shaped
// content produces. The committed fallback has no social proof and no preview, by design, so `pnpm build` alone cannot
// show them. Each build goes to its own directory under node_modules/.cache and never touches dist/.
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile, stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
// Astro's CLI from this project's install, run with the current Node binary: no PATH lookup.
const astroBin = path.join(
	path.dirname(createRequire(import.meta.url).resolve('astro/package.json')),
	'bin',
	'astro.mjs',
);
const outputRoot = path.join(root, 'node_modules/.cache/aso-e2e');

export const TOKEN = 'e2e.preview-token.signature';

// What the mock answers to `POST /api/public/events/<slug>/registrations`; a spec sets it per test.
export interface RegistrationReply {
	status: number;
	body: unknown;
	headers?: Record<string, string>;
}

export interface RegistrationRequest {
	slug: string;
	// The parsed JSON body (null when it was not JSON).
	body: unknown;
	origin: string | undefined;
	contentType: string | undefined;
}

export interface MockAdmin {
	url: string;
	// The X-Preview-Token header of every preview request, in order.
	previewTokens: (string | undefined)[];
	contentRequests: number;
	// Registration POSTs, in order, and the answer given to the next ones (default: 201 {"ok":true}).
	registrationRequests: RegistrationRequest[];
	registrationReply: RegistrationReply;
	close: () => Promise<void>;
}

// `content` answers /api/public/content (a function receives the mock's own URL, for the absolute links of the S8
// fields). `preview` answers /api/public/preview for the right token (401 for any other). The mock also plays the
// admin's registration endpoint, with CORS like the real one (the request's origin is echoed).
export async function startMockAdmin(documents: {
	content: unknown | ((adminUrl: string) => unknown);
	preview?: unknown;
}): Promise<MockAdmin> {
	const admin = {
		previewTokens: [] as (string | undefined)[],
		contentRequests: 0,
		registrationRequests: [] as RegistrationRequest[],
		registrationReply: { status: 201, body: { ok: true } } as RegistrationReply,
		url: '',
	};
	const reply = (response: import('node:http').ServerResponse, status: number, body: unknown) => {
		response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
		response.end(JSON.stringify(body));
	};
	const server = createServer(async (request: IncomingMessage, response) => {
		const { pathname } = new URL(request.url ?? '/', 'http://localhost');
		if (pathname === '/api/public/content') {
			admin.contentRequests += 1;
			const { content } = documents;
			return reply(response, 200, typeof content === 'function' ? content(admin.url) : content);
		}
		const registration = /^\/api\/public\/events\/([^/]+)\/registrations$/.exec(pathname);
		if (registration) {
			const origin = typeof request.headers.origin === 'string' ? request.headers.origin : undefined;
			const cors = origin
				? {
						'access-control-allow-origin': origin,
						'access-control-allow-methods': 'POST, OPTIONS',
						'access-control-allow-headers': 'Content-Type',
						vary: 'Origin',
					}
				: {};
			if (request.method === 'OPTIONS') return void response.writeHead(204, cors).end();
			if (request.method !== 'POST') return reply(response, 405, { error: 'method' });
			const chunks: Buffer[] = [];
			for await (const chunk of request) chunks.push(chunk as Buffer);
			let body: unknown = null;
			try {
				body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
			} catch {
				// Not JSON: recorded as null.
			}
			admin.registrationRequests.push({
				slug: registration[1],
				body,
				origin,
				contentType: request.headers['content-type'],
			});
			const { status, body: answer, headers = {} } = admin.registrationReply;
			response.writeHead(status, {
				'content-type': 'application/json',
				'cache-control': 'no-store',
				...cors,
				...headers,
			});
			return void response.end(JSON.stringify(answer));
		}
		if (/^\/api\/public\/events\/[^/]+\/calendar\.ics$/.test(pathname)) {
			response.writeHead(200, { 'content-type': 'text/calendar; charset=utf-8' });
			return void response.end('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n');
		}
		if (pathname === '/api/public/preview') {
			const token = request.headers['x-preview-token'];
			admin.previewTokens.push(typeof token === 'string' ? token : undefined);
			if (token !== TOKEN || documents.preview === undefined)
				return reply(response, 401, { error: 'Invalid or expired preview token' });
			return reply(response, 200, documents.preview);
		}
		reply(response, 404, { error: 'not found' });
	});
	await listen(server);
	const { port } = server.address() as AddressInfo;
	admin.url = `http://127.0.0.1:${port}`;
	return {
		url: admin.url,
		get registrationRequests() {
			return admin.registrationRequests;
		},
		get registrationReply() {
			return admin.registrationReply;
		},
		set registrationReply(value: RegistrationReply) {
			admin.registrationReply = value;
		},
		get previewTokens() {
			return admin.previewTokens;
		},
		get contentRequests() {
			return admin.contentRequests;
		},
		close: () => new Promise((resolve) => server.close(() => resolve())),
	};
}

const listen = (server: Server) => new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

// Variables that would change how a build behaves are cleared, so a developer's shell cannot leak into a spec.
const CLEARED = [
	'ADMIN_CONTENT_URL',
	'ADMIN_PREVIEW_URL',
	'PREVIEW_BUILD',
	'PREVIEW_TOKEN',
	'CF_PAGES_BRANCH',
	'PRODUCTION_BRANCH',
	'ALLOW_CONTENT_FALLBACK',
	'PUBLIC_CF_BEACON_TOKEN',
	'PUBLIC_TURNSTILE_SITE_KEY',
];

export interface BuildResult {
	outDir: string;
	exitCode: number;
	// stdout + stderr, for asserting on a failure message.
	output: string;
}

export function buildSite(name: string, env: Record<string, string>): Promise<BuildResult> {
	const outDir = path.join(outputRoot, name);
	const childEnv = { ...process.env, ...Object.fromEntries(CLEARED.map((key) => [key, ''])), ...env };
	return new Promise((resolve) => {
		execFile(
			process.execPath,
			[astroBin, 'build', '--outDir', outDir],
			{ cwd: root, env: childEnv, maxBuffer: 32 * 1024 * 1024 },
			(error, stdout, stderr) =>
				resolve({
					outDir,
					exitCode: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
					output: `${stdout}\n${stderr}`,
				}),
		);
	});
}

const types: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.txt': 'text/plain; charset=utf-8',
	'.xml': 'application/xml',
	'.webp': 'image/webp',
	'.png': 'image/png',
	'.woff2': 'font/woff2',
};

export interface StaticSite {
	url: string;
	close: () => Promise<void>;
}

// A plain static server over a build directory: `/x/` serves `/x/index.html`, like Cloudflare Pages.
export async function serveDirectory(dir: string): Promise<StaticSite> {
	const server = createServer(async (request, response) => {
		const { pathname } = new URL(request.url ?? '/', 'http://localhost');
		const target = path.join(dir, decodeURIComponent(pathname));
		if (!target.startsWith(dir)) return void response.writeHead(403).end();
		try {
			const file = (await stat(target)).isDirectory() ? path.join(target, 'index.html') : target;
			response.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
			response.end(await readFile(file));
		} catch {
			response.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
		}
	});
	await listen(server);
	return {
		url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
		close: () => new Promise((resolve) => server.close(() => resolve())),
	};
}

export const readBuilt = (dir: string, file: string) => readFile(path.join(dir, file), 'utf8');
export const exists = (dir: string, file: string) =>
	stat(path.join(dir, file)).then(
		() => true,
		() => false,
	);

// 1x1 transparent PNG: stands in for Cloudinary so a spec never reaches the network.
export const PIXEL = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
	'base64',
);

// Stands in for Cloudflare's Turnstile script (answered with page.route), so a spec never reaches the network. `solves`
// calls the callback with a token as soon as the widget renders, and again with a new one after every reset, like the
// real widget; `never` leaves the person unverified; `fails` reports the widget's own error.
export type TurnstileBehavior = 'solves' | 'never' | 'fails';

export const fakeTurnstile = (behavior: TurnstileBehavior): string => `
window.__turnstile = { renders: 0, resets: 0, options: null, token: null, callback: null };
window.turnstile = {
	render: function (container, options) {
		var state = window.__turnstile;
		state.renders += 1;
		state.options = { sitekey: options.sitekey, theme: options.theme, language: options.language };
		state.callback = function (token) { state.token = token; options.callback(token); };
		container.setAttribute('data-fake-turnstile', '');
		// The real widget is a 300x65 iframe; give the fake the same footprint so layout and axe see something.
		var box = document.createElement('div');
		box.style.cssText = 'width:300px;max-width:100%;height:65px';
		container.append(box);
		if (${JSON.stringify(behavior)} === 'solves') setTimeout(function () { state.callback('e2e-turnstile-token-1'); }, 0);
		if (${JSON.stringify(behavior)} === 'fails') setTimeout(function () { options['error-callback'](); }, 0);
		return 'widget-1';
	},
	reset: function () {
		var state = window.__turnstile;
		state.resets += 1;
		state.token = null;
		if (${JSON.stringify(behavior)} === 'solves') {
			var token = 'e2e-turnstile-token-' + (state.resets + 1);
			setTimeout(function () { state.callback(token); }, 0);
		}
	}
};
`;
