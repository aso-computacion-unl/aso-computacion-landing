import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { image, payload } from '../src/lib/admin-content/test-fixtures';

// The dev server from a cold start. "The landing does not work" was a dev server that started while the admin answered
// 404: it kept the committed fallback (demo cards, no tickets, no news) for as long as it ran, even after the admin was
// back. Here the admin is down when the server starts and comes up afterwards.
test.describe.configure({ mode: 'serial' });

const root = path.resolve(import.meta.dirname, '..');
const TITLE = 'Taller que llegó con el admin';
const DAY = 86_400_000;

const content = () => {
	const [base] = payload().events;
	const date = new Date(Date.now() - 5 * 3_600_000 + 20 * DAY).toISOString().slice(0, 10);
	return payload({ events: [{ ...base, slug: 'taller-recuperado', title: TITLE, date, photos: [image()] }] });
};

const listen = (server: Server) =>
	new Promise<number>((resolve) =>
		server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port)),
	);

test.describe('dev server started while the admin is down', () => {
	let admin: Server;
	let adminUp = false;
	let dev: ChildProcess;
	let site = '';
	let log = '';

	test.beforeAll(async () => {
		test.setTimeout(120_000);
		admin = createServer((request, response) => {
			const found = adminUp && request.url?.startsWith('/api/public/content');
			response.writeHead(found ? 200 : 404, { 'content-type': 'application/json' });
			response.end(found ? JSON.stringify(content()) : '{"error":"not ready"}');
		});
		const adminPort = await listen(admin);

		const free = createServer();
		const port = await listen(free);
		await new Promise((resolve) => free.close(resolve));
		site = `http://127.0.0.1:${port}`;

		dev = spawn('pnpm', ['exec', 'astro', 'dev', '--ignore-lock', '--host', '127.0.0.1', '--port', String(port)], {
			cwd: root,
			detached: true,
			env: {
				...process.env,
				ADMIN_CONTENT_URL: `http://127.0.0.1:${adminPort}/api/public/content`,
				PREVIEW_BUILD: '',
				PREVIEW_TOKEN: '',
				CF_PAGES_BRANCH: '',
			},
		});
		dev.stdout?.on('data', (chunk) => (log += String(chunk)));
		dev.stderr?.on('data', (chunk) => (log += String(chunk)));
		await expect
			.poll(async () => (await fetch(`${site}/`).catch(() => undefined))?.status, { timeout: 90_000 })
			.toBe(200);
	});

	test.afterAll(async () => {
		if (dev?.pid) process.kill(-dev.pid, 'SIGTERM');
		await new Promise((resolve) => admin?.close(resolve));
	});

	test('serves the fallback while the admin is down, and says why in its log', async ({ page }) => {
		await page.goto(`${site}/`);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await expect(page.getByText(TITLE).first()).toHaveCount(0);
		expect(log).toMatch(/fell back to src\/data\/fallback.json/);
	});

	test('shows the admin content on the next visit once the admin is back, without a restart', async ({ page }) => {
		test.setTimeout(60_000);
		adminUp = true;
		await expect
			.poll(
				async () => {
					await page.goto(`${site}/`);
					return page.getByText(TITLE).count();
				},
				{ timeout: 30_000, intervals: [1000] },
			)
			.toBeGreaterThan(0);
		await expect(page.locator('[data-reg-action], .tk').first()).toBeVisible();
	});
});
