import { expect, test, type Page } from '@playwright/test';
import { image, newsItem, openRegistration, payload, unlRegistration } from '../src/lib/admin-content/test-fixtures';
import type { PublicEvent } from '../src/lib/admin-content/types';
import {
	PIXEL,
	buildSite,
	serveDirectory,
	startMockAdmin,
	type MockAdmin,
	type StaticSite,
} from './support/admin-site';

// The editorial sections of the home (S5 tickets and rail, S6 news front page, S7 forum window), against a real build
// with a mock admin: six upcoming events (so the rail), three news posts and an admin origin (so the forum links out).
// The committed fallback build (the default webServer) covers the other side: three tickets stay a grid. One build,
// serial, like the other specs that build.
test.describe.configure({ mode: 'serial' });

const DAY = 86_400_000;
const day = (offset: number) => new Date(Date.now() - 5 * 3_600_000 + offset * DAY).toISOString().slice(0, 10);
const instant = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

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

const content = (admin: string) =>
	payload({
		events: [
			event('uno', 'Taller abierto', 5, {
				registration: openRegistration({
					capacity: 40,
					deadline: instant(4),
					endpoint: `${admin}/api/public/events/uno/registrations`,
				}),
			}),
			event('dos', 'Charla con cuenta UNL', 10, {
				registration: unlRegistration({ url: `${admin}/foro/eventos/dos` }),
			}),
			event('tres', 'Taller libre', 15, { calendarUrl: `${admin}/api/public/events/tres/calendar.ics` }),
			event('cuatro', 'Hackatón', 20, { calendarUrl: `${admin}/api/public/events/cuatro/calendar.ics` }),
			event('cinco', 'Torneo', 25),
			event('seis', 'Feria de proyectos', 30),
		],
		news: [
			newsItem({ slug: 'a', title: 'Resultados del torneo', publishedAt: '2026-10-28' }),
			newsItem({ slug: 'b', title: 'Abrimos inscripciones al taller de Git', publishedAt: '2026-10-20' }),
			newsItem({ slug: 'c', title: 'Nuevo laboratorio para la carrera', publishedAt: '2026-10-05' }),
		],
	});

let admin: MockAdmin;
let site: StaticSite;

test.beforeAll(async () => {
	test.setTimeout(240_000);
	admin = await startMockAdmin({ content });
	const built = await buildSite('editorial-b', { ADMIN_CONTENT_URL: `${admin.url}/api/public/content` });
	expect(built.exitCode, built.output).toBe(0);
	site = await serveDirectory(built.outDir);
});

test.afterAll(async () => {
	await Promise.all([site?.close(), admin?.close()]);
});

const open = async (page: Page) => {
	await page.route('https://res.cloudinary.com/**', (route) =>
		route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
	);
	await page.goto(site.url, { waitUntil: 'networkidle' });
};

const noSideScroll = async (page: Page) => {
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
	);
	expect(overflow).toBeLessThanOrEqual(0);
};

test.describe('tickets', () => {
	test.use({ reducedMotion: 'reduce' });

	test('more than three become a rail with arrows, a live counter and a progress bar', async ({ page }) => {
		await open(page);
		const list = page.locator('#inscripciones .tk-list');
		await expect(list).toHaveClass(/is-rail/);
		await expect(list.locator('.tk-item')).toHaveCount(6);

		const ui = page.locator('#inscripciones .tk-rail-ui');
		const count = ui.locator('[data-rail-count]');
		const prev = ui.getByRole('button', { name: 'Boletos anteriores' });
		const next = ui.getByRole('button', { name: 'Boletos siguientes' });
		await expect(ui).toBeVisible();
		await expect(count).toHaveText(/^01–0[1-3] de 06$/);
		await expect(prev).toBeDisabled();
		await expect(next).toBeEnabled();

		await next.click();
		await expect(prev).toBeEnabled();
		await expect(count).not.toHaveText(/^01–/);
		for (let i = 0; i < 6 && (await next.isEnabled()); i++) await next.click();
		await expect(next).toBeDisabled();
		await expect(count).toHaveText(/^0[1-6]–06 de 06$/);
		const bar = await ui.locator('[data-rail-bar]').evaluate((el) => getComputedStyle(el).transform);
		expect(bar === 'none' || bar.startsWith('matrix(1,')).toBe(true);
	});

	test('rotates the accent sky, signal, navy over the tickets', async ({ page }) => {
		await open(page);
		const accents = await page
			.locator('#inscripciones .tk-item')
			.evaluateAll((items) => items.map((i) => i.getAttribute('data-acc')));
		expect(accents).toEqual(['0', '1', '2', '0', '1', '2']);
		const bands = await page
			.locator('#inscripciones .tk-body')
			.evaluateAll((bodies) => bodies.slice(0, 3).map((b) => getComputedStyle(b).borderTopColor));
		expect(new Set(bands).size).toBe(3);
	});

	test('names the calendar link for what it does and keeps ".ics" in the title', async ({ page }) => {
		await open(page);
		const link = page.locator('#inscripciones-tres .tk-cal');
		await expect(link).toContainText('Guardar en mi calendario');
		await expect(link).toContainText('Google · Apple · Outlook');
		await expect(link).toHaveAttribute('title', /\.ics/);
		await expect(link).not.toContainText('.ics');
	});

	test('does not scroll the page sideways on a phone', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 800 });
		await open(page);
		await noSideScroll(page);
		await expect(page.locator('#inscripciones .tk-rail-ui')).toBeVisible();
	});
});

test.describe('news front page', () => {
	test.use({ reducedMotion: 'reduce' });

	test('shows the newest as a full-width banner with a badge, the rest as cards with a big day', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await open(page);
		const items = page.locator('#novedades .news-list > li');
		await expect(items).toHaveCount(3);
		await expect(page.locator('#novedades .news-new')).toHaveCount(1);
		await expect(items.first().locator('.news-new')).toHaveText('Nuevo');
		for (const item of await items.all()) {
			await expect(item.locator('time b')).toHaveText(/^\d{1,2}$/);
			await expect(item.locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);
		}
		const [lead, a, b] = await items.evaluateAll((els) =>
			els.map((el) => {
				const { x, y, width } = el.getBoundingClientRect();
				return { x, y, width };
			}),
		);
		const list = await page.locator('#novedades .news-list').boundingBox();
		expect(list && Math.abs(lead.width - list.width)).toBeLessThan(2);
		expect(Math.abs(a.y - b.y)).toBeLessThan(2);
		expect(a.x).toBeLessThan(b.x);
	});

	for (const theme of ['light', 'dark'] as const) {
		test(`stays readable in the ${theme} theme`, async ({ page }) => {
			await open(page);
			await page.evaluate((value) => (document.documentElement.dataset.theme = value), theme);
			const pairs = await page.locator('#novedades .news-link').evaluateAll((links) =>
				links.map((link) => ({
					background: getComputedStyle(link).backgroundColor,
					title: getComputedStyle(link.querySelector('.news-title')!).color,
				})),
			);
			for (const { background, title } of pairs) {
				expect(background).not.toBe(title);
				expect(background).not.toBe('rgba(0, 0, 0, 0)');
			}
		});
	}

	test('does not scroll the page sideways on a phone', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 800 });
		await open(page);
		await noSideScroll(page);
	});
});

test.describe('forum window', () => {
	test.use({ reducedMotion: 'reduce' });

	test('is an app window: title bar, chips with counts, composer, threads and a footer bar', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await open(page);
		const app = page.locator('#foro .forum-app');
		await expect(app.locator('.forum-bar')).toContainText('foro · ASO Computación');
		const chips = app.getByRole('group', { name: 'Categorías del foro' }).getByRole('button');
		await expect(chips).toHaveText([/Todos\s*3/, /General\s*0/, /Materias\s*2/, /Propuestas\s*1/]);
		await expect(chips.nth(0)).toHaveAttribute('aria-pressed', 'true');
		await expect(app.locator('.forum-compose .new')).toHaveText(/\+ Nuevo hilo/);
		// The composer shows the first prompt (the section's own line), with no typing under reduced motion.
		await expect(app.locator('[data-forum-typed]')).toHaveText(
			'Pregunta sobre materias, propón talleres y arma equipo.',
		);
		await expect(app.locator('.forum-link .av').first()).toHaveText('M');
		const foot = app.locator('.forum-foot');
		await expect(foot).toContainText('3 hilos · 3 categorías');
		await expect(foot).toContainText('Ver todos los hilos');
		await expect(app.getByRole('link', { name: /Ver todos los hilos/ })).toHaveCount(1);
		// The "lone button" is gone: nothing but the footer leads to every thread.
		await expect(page.locator('#foro .forum-threads > .btn')).toHaveCount(0);
	});

	test('filters the threads by category and leaves an empty category off', async ({ page }) => {
		await open(page);
		const app = page.locator('#foro .forum-app');
		await expect(app.locator('.forum-list > li:visible')).toHaveCount(3);
		await expect(app.getByRole('button', { name: /General/ })).toBeDisabled();

		await app.getByRole('button', { name: /Propuestas/ }).click();
		await expect(app.locator('.forum-list > li:visible')).toHaveCount(1);
		await expect(app.getByRole('button', { name: /Propuestas/ })).toHaveAttribute('aria-pressed', 'true');
		await expect(app.getByRole('button', { name: /Todos/ })).toHaveAttribute('aria-pressed', 'false');
		await expect(app.locator('[data-forum-status]')).toHaveText('Mostrando 1 de 3 hilos');

		await app.getByRole('button', { name: /Materias/ }).click();
		await expect(app.locator('.forum-list > li:visible')).toHaveCount(2);
		await app.getByRole('button', { name: /Todos/ }).click();
		await expect(app.locator('.forum-list > li:visible')).toHaveCount(3);
	});

	test('keeps every thread, the composer and the footer as links to the forum on the admin', async ({ page }) => {
		await open(page);
		const forum = page.locator('#foro');
		const href = (await forum.getByRole('link', { name: /Entrar con Google/ }).getAttribute('href')) ?? '';
		expect(new URL(href).origin).toBe(admin.url);
		for (const link of await forum.locator('.forum-app a').all()) {
			await expect(link).toHaveAttribute('href', href);
			await expect(link).toHaveAttribute('target', '_blank');
			await expect(link).toHaveAttribute('rel', /noopener/);
		}
	});

	// The field clips its overflow (the typed prompt), so a focus ring drawn outside the link would be cut away: axe cannot
	// see that, so the ring must sit inside the field.
	test('the composer link shows its keyboard focus ring inside the field', async ({ page }) => {
		await open(page);
		const link = page.locator('#foro .field-link');
		await link.scrollIntoViewIfNeeded();
		await page.keyboard.press('Tab');
		await link.focus();
		const ring = await link.evaluate((el) => {
			const style = getComputedStyle(el);
			return {
				focusVisible: el.matches(':focus-visible'),
				style: style.outlineStyle,
				width: parseFloat(style.outlineWidth),
				offset: parseFloat(style.outlineOffset),
			};
		});
		expect(ring.focusVisible).toBe(true);
		expect(ring.style).not.toBe('none');
		expect(ring.width).toBeGreaterThan(0);
		expect(ring.offset + ring.width).toBeLessThanOrEqual(0);
	});

	test('has a full-height sign-in ticket with numbered perks, categories and the Google stub at the foot', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await open(page);
		const door = page.locator('#foro .forum-door');
		await expect(door.locator('.door-perks li')).toHaveText([
			'01Pregunta sobre materias',
			'02Propón talleres',
			'03Arma equipo',
		]);
		await expect(door.locator('.door-cats li')).toHaveText(['General', 'Materias', 'Propuestas']);
		const doorBox = await door.boundingBox();
		const appBox = await page.locator('#foro .forum-app').boundingBox();
		expect(doorBox && appBox && Math.abs(doorBox.y + doorBox.height - (appBox.y + appBox.height))).toBeLessThan(2);
		const stub = await door.locator('.forum-door-stub').boundingBox();
		expect(doorBox && stub && Math.abs(doorBox.y + doorBox.height - (stub.y + stub.height))).toBeLessThan(2);
	});

	test('does not scroll the page sideways on a phone', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 800 });
		await open(page);
		await noSideScroll(page);
		const app = await page.locator('#foro .forum-app').boundingBox();
		expect(app && app.x >= 0 && app.x + app.width <= 390).toBe(true);
	});

	test.describe('without JS', () => {
		test.use({ javaScriptEnabled: false });

		test('shows the whole window as static markup, without the dead chips', async ({ page }) => {
			await page.goto(site.url);
			const app = page.locator('#foro .forum-app');
			await expect(app.locator('.forum-list > li')).toHaveCount(3);
			await expect(app.locator('[data-forum-typed]')).toHaveText(/Pregunta sobre materias/);
			await expect(app.locator('.forum-foot')).toBeVisible();
			await expect(app.locator('.forum-tabs')).toBeHidden();
		});
	});
});

test.describe('motion', () => {
	test('the composer types the forum prompts when motion is allowed', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await open(page);
		const typed = page.locator('#foro [data-forum-typed]');
		await typed.scrollIntoViewIfNeeded();
		const seen = new Set<string>();
		for (let i = 0; i < 40; i++) {
			seen.add((await typed.textContent()) ?? '');
			await page.waitForTimeout(150);
		}
		expect(seen.size).toBeGreaterThan(3);
	});
});
