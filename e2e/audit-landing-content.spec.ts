import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
	image,
	newsItem,
	openRegistration,
	payload,
	sponsor,
	unlRegistration,
} from '../src/lib/admin-content/test-fixtures';
import type { PublicContent, PublicEvent } from '../src/lib/admin-content/types';
import {
	buildSite,
	PIXEL,
	serveDirectory,
	startMockAdmin,
	type MockAdmin,
	type StaticSite,
} from './support/admin-site';

// Platform audit of the landing with content a real admin could send: very long titles, text with no break point,
// images that never load, and lists that are empty. Real builds against a mock admin; serial, because the builds share
// Astro's cache.
test.describe.configure({ mode: 'serial' });
test.use({ reducedMotion: 'reduce' });

const DAY = 86_400_000;
const day = (offset: number) => new Date(Date.now() - 5 * 3_600_000 + offset * DAY).toISOString().slice(0, 10);
const instant = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

// The longest value the validator accepts for a field: one word with no break point, or a sentence.
const word = (max: number) => 'Supercalifragilisticoespialidoso'.repeat(Math.ceil(max / 32)).slice(0, max);
const sentence = (max: number) =>
	'Una charla muy larga sobre arquitectura de software distribuido en la industria ecuatoriana '
		.repeat(Math.ceil(max / 90))
		.slice(0, max);
const TITLE = 240;
const SHORT = 200;
const TEXT = 2000;
const BROKEN = 'https://res.cloudinary.com/demo/image/upload/v1/aso/does-not-exist.jpg';

const event = (slug: string, title: string, offset: number, overrides: Partial<PublicEvent> = {}): PublicEvent => ({
	...payload().events[0],
	slug,
	title,
	date: day(offset),
	featured: false,
	linkUrl: null,
	linkLabel: null,
	photos: [image()],
	...overrides,
});

const hostile = (admin: string): PublicContent =>
	payload({
		events: [
			event('titulo-sin-cortes', word(TITLE), 10, {
				description: word(TEXT),
				lugar: word(SHORT),
				para: word(SHORT),
				hora: word(SHORT),
				highlights: [word(SHORT)],
				commitMessage: word(SHORT),
				registration: openRegistration({
					capacity: 10,
					deadline: instant(5),
					endpoint: `${admin}/api/public/events/titulo-sin-cortes/registrations`,
				}),
			}),
			event('titulo-largo', sentence(TITLE), 12, {
				description: sentence(TEXT),
				lugar: sentence(SHORT),
				registration: unlRegistration({ url: `${admin}/foro/eventos/titulo-largo` }),
				photos: [image({ url: BROKEN, alt: 'Foto que no carga' })],
			}),
			event('sin-foto', 'Evento sin foto', 14, { photos: [] }),
			event('pasado-largo', sentence(TITLE), -30, { photos: [image({ url: BROKEN, alt: 'Foto rota' })] }),
			event('pasado-sin-cortes', word(TITLE), -60, { photos: [] }),
		],
		news: [
			newsItem({
				slug: 'noticia-larga',
				title: sentence(120),
				summary: sentence(280),
				body: `${word(2000)}\n\n${sentence(2000)}`,
			}),
			newsItem({
				slug: 'noticia-sin-cortes',
				title: word(120),
				summary: word(280),
				body: word(2000),
				cover: { url: BROKEN, width: 1200, height: 800, alt: 'Portada rota' },
			}),
			newsItem({ slug: 'noticia-sin-portada', title: 'Sin portada', cover: null }),
		],
		faqs: [{ question: word(TITLE), answer: word(TEXT), command: null }],
		board: [{ name: word(TITLE), role: word(TITLE), photo: image({ url: BROKEN, alt: 'Foto rota' }) }],
		sponsors: [sponsor({ name: word(120), logo: { url: BROKEN, width: 400, height: 200, alt: word(200) } })],
		pillars: [{ word: word(SHORT), title: word(TITLE), text: word(TEXT), image: null }],
		settings: { tagline: word(TITLE), description: sentence(TEXT), about: sentence(TEXT) },
	});

// Every list the admin can leave empty, empty.
const empty = (): PublicContent =>
	payload({
		events: [],
		news: [],
		faqs: [],
		pillars: [],
		socials: [],
		board: [],
		commands: [],
		sponsors: [],
	});

const open = async (page: Page, url: string) => {
	await page.route('https://res.cloudinary.com/**', (route) =>
		route.request().url() === BROKEN
			? route.fulfill({ status: 404, body: 'not found' })
			: route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
	);
	await page.goto(url, { waitUntil: 'networkidle' });
	await page.evaluate(() => document.fonts.ready);
};

const overflow = (page: Page) =>
	page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// Elements whose box ends past the right edge of the viewport and that are not inside a scroller made for it.
const beyondTheEdge = (page: Page) =>
	page.evaluate(() => {
		const edge = document.documentElement.clientWidth;
		const scrolls = (element: Element | null) => {
			for (let node = element; node && node !== document.body; node = node.parentElement) {
				const { overflowX } = getComputedStyle(node);
				if (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'hidden' || overflowX === 'clip')
					return true;
			}
			return false;
		};
		return [...document.querySelectorAll('main *, header *, footer *')]
			.filter((element) => {
				const rect = element.getBoundingClientRect();
				const style = getComputedStyle(element);
				return (
					rect.width > 0 &&
					style.visibility !== 'hidden' &&
					style.position !== 'fixed' &&
					rect.right > edge + 1 &&
					!scrolls(element)
				);
			})
			.slice(0, 12)
			.map(
				(element) =>
					`${element.tagName.toLowerCase()}.${String(element.className).slice(0, 40)} ${(element.textContent ?? '').trim().slice(0, 24)}`,
			);
	});

const BLOCKING = ['serious', 'critical'];

test.describe('hostile content', () => {
	let admin: MockAdmin;
	let site: StaticSite;

	test.beforeAll(async () => {
		test.setTimeout(240_000);
		admin = await startMockAdmin({ content: (url: string) => hostile(url) });
		const built = await buildSite('audit-hostile', { ADMIN_CONTENT_URL: `${admin.url}/api/public/content` });
		expect(built.exitCode, built.output).toBe(0);
		// A rejected payload would build the fallback and make every check below pass for the wrong reason.
		expect(built.output).not.toMatch(/fell back/);
		site = await serveDirectory(built.outDir);
	});

	test.afterAll(async () => {
		await site?.close();
		await admin?.close();
	});

	for (const width of [320, 390, 768, 1440]) {
		test(`very long titles and unbroken words stay inside the page at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 800 });
			for (const path of ['/', '/en/', '/novedades/', '/novedades/noticia-sin-cortes/', '/novedades/noticia-larga/']) {
				await open(page, `${site.url}${path}`);
				expect(await beyondTheEdge(page), `${path} has boxes past the edge`).toEqual([]);
				expect(await overflow(page), `${path} scrolls sideways`).toBe(0);
			}
		});
	}

	test("Nosotros keeps the manifesto then the tiles and never prints the admin's about text", async ({ page }) => {
		await open(page, `${site.url}/`);
		const section = page.locator('#nosotros');
		// S4: the statement and the facts were removed from the home, so long or hostile about text has no place in it.
		await expect(section.locator('.about-statement')).toHaveCount(0);
		expect(await section.innerText()).not.toContain(sentence(TEXT).slice(0, 80));
		const manifesto = await section.locator('[data-manifesto]').boundingBox();
		const tiles = await section.locator('.bento').boundingBox();
		expect(manifesto && tiles && manifesto.y < tiles.y).toBe(true);
	});

	test('images that never load do not break the layout or the console contract', async ({ page }) => {
		const failures: string[] = [];
		page.on('pageerror', (error) => failures.push(error.message));
		await page.setViewportSize({ width: 390, height: 800 });
		await open(page, `${site.url}/`);
		await page.mouse.wheel(0, 20_000);
		await page.waitForTimeout(300);
		expect(failures).toEqual([]);
		expect(await overflow(page)).toBe(0);
	});

	test.describe('live seats with hostile text', () => {
		const SEATS = '**/api/public/events/seats';
		const answer = (events: unknown[]) => ({
			status: 200,
			contentType: 'application/json',
			headers: { 'access-control-allow-origin': '*' },
			body: JSON.stringify({ events }),
		});
		const ticket = (page: Page) => page.locator('#inscripciones-titulo-sin-cortes');

		test('a sold-out ticket with a very long title stays inside a 320px page and says it is full', async ({ page }) => {
			await page.route(SEATS, (route) =>
				route.fulfill(
					answer([{ slug: 'titulo-sin-cortes', capacity: 10, registered: 10, seatsLeft: 0, status: 'full' }]),
				),
			);
			await page.setViewportSize({ width: 320, height: 800 });
			await open(page, `${site.url}/`);
			await expect(ticket(page).locator('[data-ticket-state]')).toContainText('Sin cupos');
			expect(await overflow(page)).toBe(0);
			expect(await beyondTheEdge(page)).toEqual([]);
		});

		test('more registered than seats never shows a negative number or a meter past 100%', async ({ page }) => {
			await page.route(SEATS, (route) =>
				route.fulfill(
					answer([{ slug: 'titulo-sin-cortes', capacity: 10, registered: 25, seatsLeft: 0, status: 'open' }]),
				),
			);
			await open(page, `${site.url}/`);
			await expect(ticket(page).locator('[data-seat-num]')).toHaveText('0');
			await expect(ticket(page).locator('[data-seat-num]')).not.toContainText('-');
			const width = await ticket(page)
				.locator('[data-seat-meter] i')
				.evaluate((bar) => (bar as HTMLElement).style.width);
			expect(width).toBe('100%');
		});

		test('a negative or fractional count is not believed: the ticket keeps what it was built with', async ({
			page,
		}) => {
			await page.route(SEATS, (route) =>
				route.fulfill(
					answer([{ slug: 'titulo-sin-cortes', capacity: 10, registered: -3, seatsLeft: 13.5, status: 'open' }]),
				),
			);
			await open(page, `${site.url}/`);
			await expect(ticket(page).locator('[data-seat-num]')).toHaveText('10');
			await expect(ticket(page).locator('[data-seat-meter]')).toBeHidden();
		});
	});

	for (const theme of ['dark', 'light'] as const) {
		test(`has no serious or critical axe violations (${theme} theme)`, async ({ page }) => {
			await page.addInitScript((value) => localStorage.setItem('aso-theme', value), theme);
			for (const path of ['/', '/novedades/']) {
				await open(page, `${site.url}${path}`);
				const { violations } = await new AxeBuilder({ page }).analyze();
				expect(
					violations
						.filter((violation) => BLOCKING.includes(violation.impact ?? ''))
						.map(
							(violation) => `${path} ${violation.id}: ${violation.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
						),
				).toEqual([]);
			}
		});
	}
});

test.describe('empty lists', () => {
	let admin: MockAdmin;
	let site: StaticSite;

	test.beforeAll(async () => {
		test.setTimeout(240_000);
		admin = await startMockAdmin({ content: empty() });
		const built = await buildSite('audit-empty', { ADMIN_CONTENT_URL: `${admin.url}/api/public/content` });
		expect(built.exitCode, built.output).toBe(0);
		// A rejected payload would build the fallback and make every check below pass for the wrong reason.
		expect(built.output).not.toMatch(/fell back/);
		site = await serveDirectory(built.outDir);
	});

	test.afterAll(async () => {
		await site?.close();
		await admin?.close();
	});

	for (const width of [320, 1440]) {
		test(`the home still renders, with no sideways scroll and no dead links, at ${width}px`, async ({ page }) => {
			const failures: string[] = [];
			page.on('pageerror', (error) => failures.push(error.message));
			page.on('console', (message) => {
				if (message.type() === 'error') failures.push(message.text());
			});
			await page.setViewportSize({ width, height: 800 });
			await open(page, `${site.url}/`);
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			expect(await overflow(page)).toBe(0);
			const dead = await page.evaluate(() =>
				[...document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')]
					.map((a) => a.getAttribute('href') ?? '')
					.filter((href) => href.length > 1 && !document.getElementById(href.slice(1))),
			);
			expect(dead).toEqual([]);
			expect(failures).toEqual([]);
		});
	}

	test('the news page says there is nothing yet, instead of an empty list', async ({ page }) => {
		const response = await page.goto(`${site.url}/novedades/`);
		// The page may not exist at all when there is no news: then the menu must not link to it.
		if (response?.status() === 200) {
			await expect(page.locator('main')).not.toBeEmpty();
		} else {
			await open(page, `${site.url}/`);
			await expect(page.locator('a[href="/novedades"], a[href="/novedades/"]')).toHaveCount(0);
		}
	});

	for (const theme of ['dark', 'light'] as const) {
		test(`has no serious or critical axe violations (${theme} theme)`, async ({ page }) => {
			await page.addInitScript((value) => localStorage.setItem('aso-theme', value), theme);
			await open(page, `${site.url}/`);
			const { violations } = await new AxeBuilder({ page }).analyze();
			expect(
				violations
					.filter((violation) => BLOCKING.includes(violation.impact ?? ''))
					.map((violation) => `${violation.id}: ${violation.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
			).toEqual([]);
		});
	}
});
