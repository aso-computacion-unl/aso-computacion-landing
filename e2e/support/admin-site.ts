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

export interface MockAdmin {
	url: string;
	// The X-Preview-Token header of every preview request, in order.
	previewTokens: (string | undefined)[];
	contentRequests: number;
	close: () => Promise<void>;
}

// `content` answers /api/public/content (a function receives the mock's own URL, for the absolute links of the S8
// fields). `preview` answers /api/public/preview for the right token (401 for any other). It also serves the calendar
// files, so a link to one can be followed.
export async function startMockAdmin(documents: {
	content: unknown | ((adminUrl: string) => unknown);
	preview?: unknown;
}): Promise<MockAdmin> {
	const admin = {
		previewTokens: [] as (string | undefined)[],
		contentRequests: 0,
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
