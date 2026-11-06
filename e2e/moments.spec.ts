import { expect, test, type Page } from '@playwright/test';
import {
	newsItem,
	openRegistration,
	payload,
	structuredData,
	unlRegistration,
} from '../src/lib/admin-content/test-fixtures';
import {
	PIXEL,
	buildSite,
	serveDirectory,
	startMockAdmin,
	type MockAdmin,
	type StaticSite,
} from './support/admin-site';

// The hero's official logo and the small moment from the degree (hacking in the Novedades title). They need an admin
// with tickets and news, so the build is a real one against a mock. Each one is quiet: nothing runs under reduced motion, and the page never shifts while one plays.
test.describe.configure({ mode: 'serial' });

const DAY = 86_400_000;
const day = (offset: number) => new Date(Date.now() - 5 * 3_600_000 + offset * DAY).toISOString().slice(0, 10);

const content = (admin: string) => {
	const base = payload();
	const event = (slug: string, title: string, offset: number, overrides: object) => ({
		...base.events[0],
		slug,
		title,
		date: day(offset),
		featured: false,
		linkUrl: null,
		linkLabel: null,
		photos: [],
		calendarUrl: null,
		structuredData: structuredData({ startDate: `${day(offset)}T15:00:00-05:00` }),
		...overrides,
	});
	return payload({
		events: [
			event('charla-abierta', 'Charla abierta', 20, {
				registration: openRegistration({
					capacity: 40,
					endpoint: `${admin}/api/public/events/charla-abierta/registrations`,
				}),
			}),
			event('hackathon-unl', 'Hackathon UNL', 30, {
				registration: unlRegistration({ url: `${admin}/foro/eventos/hackathon-unl` }),
			}),
		],
		news: [newsItem({ cover: null }), newsItem({ slug: 'otra', title: 'Otra novedad', cover: null })],
	});
};

const open = async (page: Page, url: string) => {
	await page.route('https://res.cloudinary.com/**', (route) =>
		route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
	);
	await page.goto(url, { waitUntil: 'networkidle' });
};

test.describe('moments from the degree', () => {
	let admin: MockAdmin;
	let site: StaticSite;

	test.beforeAll(async () => {
		test.setTimeout(240_000);
		admin = await startMockAdmin({ content });
		const built = await buildSite('moments', { ADMIN_CONTENT_URL: `${admin.url}/api/public/content` });
		expect(built.exitCode, built.output).toBe(0);
		site = await serveDirectory(built.outDir);
	});

	test.afterAll(async () => {
		await Promise.all([site?.close(), admin?.close()]);
	});

	test.describe('official logo (hero)', () => {
		test.use({ viewport: { width: 1440, height: 900 } });

		test('there is no ping network: the round logo sits beside the headline and its outline draws itself', async ({
			page,
		}) => {
			await open(page, `${site.url}/`);
			await expect(page.locator('[data-net]')).toHaveCount(0);
			await expect(page.locator('[data-hero-logo]')).toHaveAttribute('aria-hidden', 'true');
			const mark = page.locator('.theme-light-only[data-hero-logo-mark]');
			await expect(mark).toBeVisible();
			const box = await page.evaluate(() => {
				const logo = document.querySelector('[data-hero-logo]')!.getBoundingClientRect();
				const title = document.querySelector('.hero-title')!.getBoundingClientRect();
				return { right: logo.left >= title.right - 1, overlap: logo.top < title.bottom && logo.bottom > title.top };
			});
			expect(box).toEqual({ right: true, overlap: true });
			await expect
				.poll(
					() =>
						page.evaluate(() =>
							[...document.querySelectorAll('[data-iso-ghost] path')].map((p) => getComputedStyle(p).strokeDashoffset),
						),
					{ timeout: 6000 },
				)
				.toEqual(expect.arrayContaining(['0px']));
		});

		test('with reduced motion the logo and its outline are simply there', async ({ browser }) => {
			const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
			const page = await context.newPage();
			await open(page, `${site.url}/`);
			const mark = page.locator('.theme-light-only[data-hero-logo-mark]');
			await expect(mark).toBeVisible();
			expect(await mark.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
			const offsets = await page.evaluate(() =>
				[...document.querySelectorAll('[data-iso-ghost] path')].map((p) => getComputedStyle(p).strokeDashoffset),
			);
			expect(offsets.every((offset) => offset === '0px')).toBe(true);
			await context.close();
		});
	});

	test.describe('hacking (Novedades title)', () => {
		test('keeps the real title for assistive technology and moves nothing while it resolves', async ({ page }) => {
			await open(page, `${site.url}/`);
			const heading = page.getByRole('heading', { name: 'Novedades', level: 2 });
			await expect(heading).toBeAttached();
			const box = () =>
				heading.evaluate((node) => {
					const rect = node.getBoundingClientRect();
					return { top: Math.round(rect.top + scrollY), height: Math.round(rect.height) };
				});
			const before = await box();
			await heading.scrollIntoViewIfNeeded();
			const seen: string[] = [];
			const shifts: { top: number; height: number }[] = [];
			for (let i = 0; i < 12; i += 1) {
				seen.push(await heading.locator('[data-decrypt]').innerText());
				shifts.push(await box());
				await page.waitForTimeout(150);
			}
			for (const sample of shifts) expect(sample).toEqual(before);
			// It was scrambled for a moment, and it ends as the real title.
			expect(seen.some((text) => text !== 'Novedades')).toBe(true);
			await expect(heading.locator('[data-decrypt]')).toHaveText('Novedades', { timeout: 8000 });
			await expect(heading.locator('.dc')).toHaveCount(0);
		});

		test('with reduced motion the title is simply written', async ({ browser }) => {
			const context = await browser.newContext({ reducedMotion: 'reduce' });
			const page = await context.newPage();
			await open(page, `${site.url}/`);
			await page.getByRole('heading', { name: 'Novedades', level: 2 }).scrollIntoViewIfNeeded();
			await page.waitForTimeout(500);
			await expect(page.locator('#novedades [data-decrypt]')).toHaveText('Novedades');
			await expect(page.locator('#novedades .dc')).toHaveCount(0);
			await context.close();
		});
	});
});
