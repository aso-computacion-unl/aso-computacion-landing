// Reports the JavaScript the home page requests on first load, per device profile, from a running preview server:
//   pnpm build && pnpm preview --port 4321   (another terminal)
//   node scripts/measure-js.mjs [baseUrl]
// Sizes are brotli-compressed, which is what Cloudflare Pages sends; `files` lists what was requested.
import { brotliCompressSync } from 'node:zlib';
import { chromium, devices } from '@playwright/test';

const base = process.argv[2] ?? 'http://127.0.0.1:4321';

const profiles = {
	'desktop (mouse)': {},
	'phone (touch)': { ...devices['Pixel 7'] },
	'desktop, reduced motion': { reducedMotion: 'reduce' },
};

const browser = await chromium.launch();
for (const [name, options] of Object.entries(profiles)) {
	const context = await browser.newContext(options);
	const page = await context.newPage();
	const scripts = new Map();
	page.on('response', async (response) => {
		if (response.request().resourceType() !== 'script') return;
		const body = await response.body().catch(() => null);
		if (body) scripts.set(new URL(response.url()).pathname.split('/').pop(), body);
	});
	await page.goto(`${base}/`, { waitUntil: 'load' });
	await page.waitForTimeout(3000);
	const raw = [...scripts.values()].reduce((sum, body) => sum + body.length, 0);
	const br = [...scripts.values()].reduce((sum, body) => sum + brotliCompressSync(body).length, 0);
	console.log(`${name}: ${scripts.size} files, ${raw} B raw, ${br} B brotli`);
	for (const [file, body] of scripts) console.log(`  ${file.replace(/\.[\w-]{8}\.js$/, '.js')} ${body.length} B`);
	await context.close();
}
await browser.close();
