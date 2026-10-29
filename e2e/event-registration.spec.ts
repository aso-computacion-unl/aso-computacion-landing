import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
	image,
	openRegistration,
	payload,
	structuredData,
	unlRegistration,
} from '../src/lib/admin-content/test-fixtures';
import type { PublicEvent } from '../src/lib/admin-content/types';
import {
	PIXEL,
	readBuilt,
	buildSite,
	serveDirectory,
	startMockAdmin,
	type MockAdmin,
	type StaticSite,
} from './support/admin-site';

// Real builds of the landing against a mock admin (S8): the per-event tickets, whose only action links to the admin's
// event page (`/foro/eventos/<slug>`, for both registration modes: the landing has no form), the live seats, the .ics
// link and the Event structured data. One file, serial: the builds share Astro's cache, so they must not overlap.
test.describe.configure({ mode: 'serial' });
test.use({ reducedMotion: 'reduce' });

const DAY = 86_400_000;
// A calendar day in Ecuador (UTC-5), `offset` days from today. Events are dated relative to the build so the spec does
// not go stale: what is "upcoming" depends on the day the build runs.
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

const calendar = (admin: string, slug: string) => `${admin}/api/public/events/${slug}/calendar.ics`;
const schedule = (offset: number, extra: Partial<ReturnType<typeof structuredData>> = {}) =>
	structuredData({
		startDate: `${day(offset)}T15:00:00-05:00`,
		endDate: `${day(offset)}T17:00:00-05:00`,
		...extra,
	});

const registrationContent = (admin: string) =>
	payload({
		events: [
			event('taller-abierto', 'Taller abierto', 30, {
				registration: openRegistration({
					capacity: 40,
					deadline: instant(20),
					endpoint: `${admin}/api/public/events/taller-abierto/registrations`,
				}),
				calendarUrl: calendar(admin, 'taller-abierto'),
				structuredData: schedule(30),
			}),
			event('charla-unl', 'Charla con cuenta UNL', 35, {
				registration: unlRegistration({ url: `${admin}/foro/eventos/charla-unl` }),
				calendarUrl: calendar(admin, 'charla-unl'),
				structuredData: schedule(35, { registrationUrl: `${admin}/foro/eventos/charla-unl`, location: 'Auditorio' }),
			}),
			event('taller-libre', 'Taller libre', 40, {
				calendarUrl: calendar(admin, 'taller-libre'),
				structuredData: schedule(40),
			}),
			event('taller-cerrado', 'Taller cerrado', 45, {
				registration: openRegistration({
					deadline: instant(-2),
					endpoint: `${admin}/api/public/events/taller-cerrado/registrations`,
				}),
				calendarUrl: calendar(admin, 'taller-cerrado'),
				structuredData: schedule(45),
			}),
			event('taller-pasado', 'Taller pasado', -20, {
				registration: openRegistration({
					endpoint: `${admin}/api/public/events/taller-pasado/registrations`,
				}),
				calendarUrl: calendar(admin, 'taller-pasado'),
				structuredData: schedule(-20),
			}),
			event('sin-extras', 'Evento sin extras', 50),
		],
	});

// The same events from an admin that predates S8: none of the three keys.
const legacyContent = (admin: string) => {
	const content = registrationContent(admin);
	return {
		...content,
		events: content.events.map(({ registration: _r, calendarUrl: _c, structuredData: _s, ...rest }) => rest),
	};
};

// The same events, but their registration, UNL page and calendar links point at a host that is not the admin.
const EVIL = 'https://evil.example.test';
const foreignContent = (admin: string) => {
	const content = registrationContent(admin);
	return {
		...content,
		events: content.events.map((item) => ({
			...item,
			registration: item.registration && {
				...item.registration,
				url: item.registration.url && `${EVIL}/foro/eventos/${item.slug}`,
				endpoint: item.registration.endpoint && `${EVIL}/api/public/events/${item.slug}/registrations`,
			},
			calendarUrl: item.calendarUrl && `${EVIL}/api/public/events/${item.slug}/calendar.ics`,
		})),
	};
};

const open = async (page: Page, url: string, waitUntil: 'networkidle' | 'load' = 'networkidle') => {
	await page.route('https://res.cloudinary.com/**', (route) =>
		route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
	);
	await page.goto(url, { waitUntil });
};

const card = (page: Page, slug: string) => page.locator(`#evento-${slug}`);
// The ticket of an activity in the Inscripciones section; its action is the link to the admin's event page.
const ticket = (page: Page, slug: string) => page.locator(`#inscripciones-${slug}`);
const action = (page: Page, slug = 'taller-abierto') => ticket(page, slug).locator('[data-reg-action]');
const eventPage = (admin: MockAdmin, slug: string) => `${admin.url}/foro/eventos/${slug}`;

const ldEvents = async (page: Page) => {
	const texts = await page.locator('script[type="application/ld+json"]').allTextContents();
	return texts.map((text) => JSON.parse(text) as Record<string, unknown>).filter((data) => data['@type'] === 'Event');
};

test.describe('registration from the admin', () => {
	let admin: MockAdmin;
	let site: StaticSite;
	let mainOutput = '';
	let mainDir = '';
	let legacyAdmin: MockAdmin;
	let legacySite: StaticSite;
	let foreignAdmin: MockAdmin;
	let foreignSite: StaticSite;
	let foreignOutput = '';
	let foreignDir = '';
	let emptyAdmin: MockAdmin;
	let emptySite: StaticSite;

	test.beforeAll(async () => {
		test.setTimeout(420_000);
		admin = await startMockAdmin({ content: registrationContent });
		const built = await buildSite('registration', { ADMIN_CONTENT_URL: `${admin.url}/api/public/content` });
		expect(built.exitCode, built.output).toBe(0);
		mainOutput = built.output;
		mainDir = built.outDir;
		site = await serveDirectory(built.outDir);

		legacyAdmin = await startMockAdmin({ content: legacyContent });
		const legacy = await buildSite('registration-legacy', {
			ADMIN_CONTENT_URL: `${legacyAdmin.url}/api/public/content`,
		});
		expect(legacy.exitCode, legacy.output).toBe(0);
		legacySite = await serveDirectory(legacy.outDir);

		// Links on another origin than ADMIN_CONTENT_URL's: left out, and the build says so.
		foreignAdmin = await startMockAdmin({ content: foreignContent });
		const foreign = await buildSite('registration-foreign', {
			ADMIN_CONTENT_URL: `${foreignAdmin.url}/api/public/content`,
		});
		expect(foreign.exitCode, foreign.output).toBe(0);
		foreignOutput = foreign.output;
		foreignDir = foreign.outDir;
		foreignSite = await serveDirectory(foreign.outDir);

		// Nothing upcoming: no ticket, so no section and no link to it.
		emptyAdmin = await startMockAdmin({ content: () => payload({ events: [event('viejo', 'Taller viejo', -20)] }) });
		const empty = await buildSite('registration-empty', { ADMIN_CONTENT_URL: `${emptyAdmin.url}/api/public/content` });
		expect(empty.exitCode, empty.output).toBe(0);
		emptySite = await serveDirectory(empty.outDir);
	});

	test.afterAll(async () => {
		await Promise.all([
			site?.close(),
			admin?.close(),
			legacySite?.close(),
			legacyAdmin?.close(),
			foreignSite?.close(),
			foreignAdmin?.close(),
			emptySite?.close(),
			emptyAdmin?.close(),
		]);
	});

	test.describe('what each ticket shows', () => {
		test('an open-mode ticket links to the admin event page, with the capacity and the deadline, and holds no form', async ({
			page,
		}) => {
			const challenges: string[] = [];
			page.on('request', (request) => {
				if (request.url().includes('challenges.cloudflare.com')) challenges.push(request.url());
			});
			await open(page, `${site.url}/`);
			const item = ticket(page, 'taller-abierto');
			const link = item.getByRole('link', { name: /Inscribirme/ });
			await expect(link).toHaveAttribute('href', eventPage(admin, 'taller-abierto'));
			await expect(link).not.toHaveAttribute('target', /.+/);
			await expect(item.locator('[data-seat-num]')).toHaveText('40');
			await expect(item.locator('[data-seat-label]')).toHaveText('cupos');
			await expect(item.locator('[data-seat-meter]')).toBeHidden();
			// The build saw the deadline 20 days away; the days left are counted from the visitor's clock.
			await expect(item.locator('[data-reg-closes]')).toHaveText(/Cierra en (19|20) días/);
			await expect(item).toContainText('hora de Ecuador');
			await expect(item).toContainText('Sin cuenta');
			// The form lives in the admin: nothing in the section takes what someone types, and Cloudflare is never asked.
			await expect(
				page.locator('#inscripciones form, #inscripciones input, [data-reg-form], [data-reg-panel]'),
			).toHaveCount(0);
			expect(challenges).toEqual([]);
		});

		test('a UNL-mode ticket links to the same page and says the account it takes', async ({ page }) => {
			await open(page, `${site.url}/`);
			const item = ticket(page, 'charla-unl');
			await expect(item.getByRole('link', { name: /Inscribirme/ })).toHaveAttribute(
				'href',
				eventPage(admin, 'charla-unl'),
			);
			await expect(item).toContainText('@unl.edu.ec');
			await expect(item).toContainText('Sin fecha límite de inscripción');
		});

		test('an activity with registration off gets a free pass: no action, no seats, its calendar link', async ({
			page,
		}) => {
			await open(page, `${site.url}/`);
			const item = ticket(page, 'taller-libre');
			await expect(item).toContainText('Pase libre');
			await expect(item).toContainText('Entrada libre');
			await expect(item.locator('[data-reg], [data-reg-action], [data-seat-num]')).toHaveCount(0);
			await expect(item.getByRole('link', { name: /Añadir al calendario/ })).toHaveAttribute(
				'href',
				calendar(admin.url, 'taller-libre'),
			);
			// A free pass has no seats: the script that paints them never looks for it.
			await expect(item).not.toHaveAttribute('data-ticket', /.+/);
		});

		test('a ticket whose deadline passed says so, with its action disabled', async ({ page }) => {
			await open(page, `${site.url}/`);
			const item = ticket(page, 'taller-cerrado');
			await expect(item.locator('[data-ticket-state]')).toHaveText('Inscripciones cerradas');
			await expect(action(page, 'taller-cerrado')).toHaveAttribute('aria-disabled', 'true');
			await expect(action(page, 'taller-cerrado')).not.toHaveAttribute('href', /.+/);
		});

		test('a past event has no ticket and no calendar, and an event the admin gave no extras is a free pass', async ({
			page,
		}) => {
			await open(page, `${site.url}/`);
			await expect(page.locator('#evento-taller-pasado')).toHaveCount(0);
			await expect(ticket(page, 'taller-pasado')).toHaveCount(0);
			const past = page.locator('li.commit', { hasText: 'Taller pasado' });
			await expect(past).toHaveCount(1);
			await expect(past.locator('.reg, .reg-calendar')).toHaveCount(0);
			await expect(card(page, 'sin-extras').locator('.reg')).toHaveCount(0);
			await expect(ticket(page, 'sin-extras')).toContainText('Pase libre');
		});

		test('a registration that expired after the build closes in the browser', async ({ page }) => {
			// The build saw an open deadline (20 days away); the visitor's clock is past it.
			await page.clock.setFixedTime(new Date(Date.now() + 25 * DAY));
			await open(page, `${site.url}/`);
			const item = ticket(page, 'taller-abierto');
			await expect(item.locator('[data-ticket-state]')).toHaveText('Inscripciones cerradas');
			await expect(action(page)).toHaveAttribute('aria-disabled', 'true');
			await expect(action(page)).not.toHaveAttribute('href', /.+/);
			await expect(item.locator('[data-reg-extra]:visible')).toHaveCount(0);
		});

		test('speaks English on the English home', async ({ page }) => {
			await open(page, `${site.url}/en/`);
			const item = ticket(page, 'taller-abierto');
			await expect(item.getByRole('heading', { level: 3 })).toHaveText('Taller abierto');
			await expect(item).toContainText('Ticket 001');
			await expect(item).toContainText('With a form');
			await expect(action(page)).toHaveText(/Sign me up/);
			await expect(action(page)).toHaveAttribute('href', eventPage(admin, 'taller-abierto'));
			await expect(item.locator('[data-seat-label]')).toHaveText('seats');
			await expect(item).toContainText('Ecuador time');
			await expect(ticket(page, 'taller-libre').getByRole('link', { name: /Add to calendar/ })).toBeVisible();
			await expect(ticket(page, 'charla-unl').getByRole('link', { name: /Sign me up/ })).toBeVisible();
		});
	});

	test.describe('the Inscripciones section', () => {
		test('has one ticket per upcoming activity, nearest date first, numbering only the ones that take registrations', async ({
			page,
		}) => {
			await open(page, `${site.url}/`);
			const ids = await page.locator('#inscripciones .tk-item').evaluateAll((nodes) => nodes.map((node) => node.id));
			expect(ids).toEqual([
				'inscripciones-taller-abierto',
				'inscripciones-charla-unl',
				'inscripciones-taller-libre',
				'inscripciones-taller-cerrado',
				'inscripciones-sin-extras',
			]);
			const labels = await page.locator('#inscripciones .tk-no').allTextContents();
			expect(labels).toEqual(['Boleto 001', 'Boleto 002', 'Pase libre', 'Boleto 003', 'Pase libre']);
			const modes = await page.locator('#inscripciones .tk-chip').allTextContents();
			expect(modes).toEqual([
				'Con formulario',
				'Con cuenta UNL',
				'Sin inscripción',
				'Con formulario',
				'Sin inscripción',
			]);
		});

		test('shows the facts the admin gave and only those', async ({ page }) => {
			await open(page, `${site.url}/`);
			const facts = ticket(page, 'taller-abierto').locator('.tk-facts');
			await expect(facts).toContainText('Fecha');
			await expect(facts).toContainText('Hora');
			await expect(facts).toContainText('Lugar');
			await expect(facts).toContainText('Laboratorio');
			await expect(facts).toContainText('Para');
		});

		test('is in the header menu, and its legend lists how people sign up', async ({ page }) => {
			await open(page, `${site.url}/`);
			await expect(page.locator('header nav a[href="#inscripciones"]')).toHaveText('inscripciones');
			await expect(page.locator('#inscripciones .tk-key li')).toHaveCount(3);
		});

		test('the activity cards link to their ticket instead of holding a form', async ({ page }) => {
			await open(page, `${site.url}/`);
			for (const slug of ['taller-abierto', 'charla-unl', 'taller-cerrado']) {
				await expect(card(page, slug).getByRole('link', { name: /Ver el boleto de inscripción/ })).toHaveAttribute(
					'href',
					`#inscripciones-${slug}`,
				);
			}
			// A free activity has no ticket to send people to.
			await expect(card(page, 'taller-libre').getByRole('link', { name: /Ver el boleto/ })).toHaveCount(0);
			await card(page, 'taller-abierto')
				.getByRole('link', { name: /Ver el boleto/ })
				.click();
			await expect(page).toHaveURL(/#inscripciones-taller-abierto$/);
			await expect(ticket(page, 'taller-abierto')).toBeInViewport();
		});

		test('is left out, with its link in the menu, when nothing is upcoming', async ({ page }) => {
			await open(page, `${emptySite.url}/`);
			await expect(page.locator('#inscripciones')).toHaveCount(0);
			await expect(page.locator('header nav a[href="#inscripciones"]')).toHaveCount(0);
			await expect(page.locator('#evento-viejo')).toHaveCount(0);
		});

		test('the landing ships no registration form, script or Turnstile reference', async () => {
			for (const file of ['index.html', 'en/index.html']) {
				const html = await readBuilt(mainDir, file);
				expect(html, file).not.toMatch(/<form\b[^>]*data-reg-form|turnstile|challenges\.cloudflare/i);
			}
		});

		test('without JavaScript the tickets still link to the admin', async ({ browser }) => {
			const context = await browser.newContext({ javaScriptEnabled: false });
			const page = await context.newPage();
			await page.route('https://res.cloudinary.com/**', (route) =>
				route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
			);
			await page.goto(`${site.url}/`);
			await expect(action(page)).toHaveAttribute('href', eventPage(admin, 'taller-abierto'));
			await expect(action(page, 'charla-unl')).toHaveAttribute('href', eventPage(admin, 'charla-unl'));
			await context.close();
		});
	});

	test.describe('live seats', () => {
		const SEATS = '**/api/public/events/seats';
		const answer = (events: unknown[]) => ({
			status: 200,
			contentType: 'application/json',
			headers: { 'access-control-allow-origin': '*' },
			body: JSON.stringify({ events }),
		});
		const seatsOf = (slug: string, capacity: number | null, registered: number, status = 'open') => ({
			slug,
			capacity,
			registered,
			seatsLeft: capacity === null ? null : Math.max(0, capacity - registered),
			status,
		});

		test('asks the admin once at page load, as a plain GET with no credentials', async ({ page }) => {
			const requests: { method: string; cookie: string | undefined }[] = [];
			await page.route(SEATS, (route) => {
				requests.push({ method: route.request().method(), cookie: route.request().headers().cookie });
				return route.fulfill(answer([seatsOf('taller-abierto', 40, 5)]));
			});
			await open(page, `${site.url}/`);
			await expect(ticket(page, 'taller-abierto').locator('[data-seat-num]')).toHaveText('35');
			expect(requests).toEqual([{ method: 'GET', cookie: undefined }]);
		});

		test('shows "N cupos libres de M" and the meter on each ticket', async ({ page }) => {
			await page.route(SEATS, (route) =>
				route.fulfill(answer([seatsOf('taller-abierto', 40, 38), seatsOf('charla-unl', 60, 42)])),
			);
			await open(page, `${site.url}/`);
			const item = ticket(page, 'taller-abierto');
			await expect(item.locator('[data-seat-num]')).toHaveText('2');
			await expect(item.locator('[data-seat-label]')).toHaveText('cupos libres de 40');
			await expect(item.locator('[data-seat-taken]')).toHaveText('38 ocupados');
			const meter = item.locator('[data-seat-meter]');
			await expect(meter).toHaveAttribute('aria-label', '38 de 40 cupos ocupados');
			expect(await meter.locator('i').evaluate((node) => (node as HTMLElement).style.width)).toBe('95%');
			// Still open: the action is the link to the admin's event page.
			await expect(action(page)).toHaveAttribute('href', eventPage(admin, 'taller-abierto'));
			// The UNL ticket gets its own numbers from the same answer.
			await expect(ticket(page, 'charla-unl').locator('[data-seat-label]')).toHaveText('cupos libres de 60');
			await expect(ticket(page, 'charla-unl').locator('[data-seat-num]')).toHaveText('18');
		});

		test('says "1 cupo libre" in the singular', async ({ page }) => {
			await page.route(SEATS, (route) => route.fulfill(answer([seatsOf('taller-abierto', 40, 39)])));
			await open(page, `${site.url}/`);
			await expect(ticket(page, 'taller-abierto').locator('[data-seat-label]')).toHaveText('cupo libre de 40');
		});

		test('speaks English', async ({ page }) => {
			await page.route(SEATS, (route) => route.fulfill(answer([seatsOf('taller-abierto', 40, 38)])));
			await open(page, `${site.url}/en/`);
			const item = ticket(page, 'taller-abierto');
			await expect(item.locator('[data-seat-label]')).toHaveText('seats left of 40');
			await expect(item.locator('[data-seat-meter]')).toHaveAttribute('aria-label', '38 of 40 seats taken');
		});

		test('a full event says "Sin cupos" and its action goes nowhere', async ({ page }) => {
			await page.route(SEATS, (route) => route.fulfill(answer([seatsOf('taller-abierto', 40, 40, 'full')])));
			await open(page, `${site.url}/`);
			const item = ticket(page, 'taller-abierto');
			await expect(item.locator('[data-ticket-state]')).toHaveText('Sin cupos');
			await expect(item.locator('[data-seat-num]')).toHaveText('0');
			await expect(action(page)).toHaveAttribute('aria-disabled', 'true');
			await expect(action(page)).not.toHaveAttribute('href', /.+/);
			await expect(item.locator('[data-reg-extra]:visible')).toHaveCount(0);
		});

		test('a closed event says "Inscripciones cerradas" and its link goes nowhere', async ({ page }) => {
			await page.route(SEATS, (route) => route.fulfill(answer([seatsOf('charla-unl', 60, 10, 'closed')])));
			await open(page, `${site.url}/`);
			const item = ticket(page, 'charla-unl');
			await expect(item.locator('[data-ticket-state]')).toHaveText('Inscripciones cerradas');
			for (const hook of ['[data-seat-num]', '[data-seat-meter]', '[data-seat-taken]'])
				await expect(item.locator(hook)).toBeHidden();
			const link = item.locator('[data-reg-action]');
			await expect(link).toHaveAttribute('aria-disabled', 'true');
			await expect(link).not.toHaveAttribute('href', /.+/);
		});

		test('an event with no capacity shows no numbers, only its state', async ({ page }) => {
			await page.route(SEATS, (route) => route.fulfill(answer([seatsOf('charla-unl', null, 12)])));
			await open(page, `${site.url}/`);
			const item = ticket(page, 'charla-unl');
			for (const hook of ['[data-seat-num]', '[data-seat-meter]', '[data-seat-taken]'])
				await expect(item.locator(hook)).toBeHidden();
			await expect(item.locator('[data-reg-action]')).toHaveAttribute('href', eventPage(admin, 'charla-unl'));
		});

		test('an answer that does not match the contract changes nothing', async ({ page }) => {
			await page.route(SEATS, (route) =>
				route.fulfill(answer([{ slug: 'taller-abierto', capacity: 'muchos', registered: 1, status: 'open' }, null])),
			);
			await open(page, `${site.url}/`);
			await expect(ticket(page, 'taller-abierto').locator('[data-seat-num]')).toHaveText('40');
			await expect(action(page)).toHaveAttribute('href', eventPage(admin, 'taller-abierto'));
		});

		for (const [name, handler] of [
			['the request fails', (route: import('@playwright/test').Route) => route.abort()],
			[
				'the admin answers with an error',
				(route: import('@playwright/test').Route) => route.fulfill({ status: 503, body: '{}' }),
			],
			[
				'the answer is not JSON',
				(route: import('@playwright/test').Route) =>
					route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body: '<html>' }),
			],
		] as const) {
			test(`when ${name} the ticket keeps its capacity and its action`, async ({ page }) => {
				await page.route(SEATS, handler);
				await open(page, `${site.url}/`);
				const item = ticket(page, 'taller-abierto');
				await expect(item.locator('[data-seat-num]')).toHaveText('40');
				await expect(item.locator('[data-seat-label]')).toHaveText('cupos');
				await expect(item.locator('[data-seat-meter]')).toBeHidden();
				await expect(item.locator('[data-ticket-state]')).toBeHidden();
				await expect(action(page)).toHaveAttribute('href', eventPage(admin, 'taller-abierto'));
				await expect(action(page, 'charla-unl')).toHaveAttribute('href', eventPage(admin, 'charla-unl'));
			});
		}

		test('a ticket keeps its height when its seats arrive', async ({ page }) => {
			const height = () => ticket(page, 'taller-abierto').evaluate((node) => node.getBoundingClientRect().height);
			let answerSeats: (() => void) | undefined;
			await page.route(SEATS, (route) => {
				answerSeats = () => void route.fulfill(answer([seatsOf('taller-abierto', 40, 38)])).catch(() => {});
			});
			await open(page, `${site.url}/`, 'load');
			await expect(ticket(page, 'taller-abierto')).toBeVisible();
			const before = await height();
			answerSeats?.();
			await expect(ticket(page, 'taller-abierto').locator('[data-seat-num]')).toHaveText('2');
			await expect(ticket(page, 'taller-abierto').locator('[data-seat-meter]')).toBeVisible();
			expect(await height()).toBe(before);
		});

		test('gives back the room held for the meter when the admin cannot be reached', async ({ page }) => {
			await page.route(SEATS, (route) => route.abort());
			await open(page, `${site.url}/`);
			await expect(page.locator('#inscripciones')).toHaveAttribute('data-seats-settled', '');
			await expect(ticket(page, 'taller-abierto').locator('[data-seat-meter]')).toHaveCSS('display', 'none');
		});

		test('when the admin is slow the ticket keeps its capacity and its link, and a late answer is ignored', async ({
			page,
		}) => {
			test.setTimeout(30_000);
			let late: (() => void) | undefined;
			await page.route(SEATS, (route) => {
				late = () => void route.fulfill(answer([seatsOf('taller-abierto', 40, 40, 'full')])).catch(() => {});
			});
			await open(page, `${site.url}/`);
			await expect(action(page)).toHaveAttribute('href', eventPage(admin, 'taller-abierto'));
			// `open` waited for the network to be idle, which only happens once the request gave up (4 s).
			late?.();
			await page.waitForTimeout(300);
			await expect(ticket(page, 'taller-abierto').locator('[data-seat-num]')).toHaveText('40');
			await expect(ticket(page, 'taller-abierto').locator('[data-ticket-state]')).toBeHidden();
		});
	});

	test.describe('calendar and structured data', () => {
		test('links the .ics of every upcoming event that has one', async ({ page }) => {
			await open(page, `${site.url}/`);
			for (const slug of ['taller-abierto', 'charla-unl', 'taller-libre', 'taller-cerrado']) {
				await expect(card(page, slug).getByRole('link', { name: /Añadir al calendario/ })).toHaveAttribute(
					'href',
					calendar(admin.url, slug),
				);
			}
			// The cards of the activity graph; the free pass's ticket repeats its own.
			await expect(page.locator('li.commit').getByRole('link', { name: /Añadir al calendario/ })).toHaveCount(4);
		});

		test('prints one Event per upcoming event that has schema values, with its registration as the offer', async ({
			page,
		}) => {
			await open(page, `${site.url}/`);
			const events = await ldEvents(page);
			// Page order is the timeline's: the furthest date first.
			expect(events.map((data) => data.name)).toEqual([
				'Taller cerrado',
				'Taller libre',
				'Charla con cuenta UNL',
				'Taller abierto',
			]);

			const named = (name: string) => events.find((data) => data.name === name) as Record<string, unknown>;
			const [openEvent, unlEvent, freeEvent, closedEvent] = [
				named('Taller abierto'),
				named('Charla con cuenta UNL'),
				named('Taller libre'),
				named('Taller cerrado'),
			];
			expect(openEvent).toMatchObject({
				'@context': 'https://schema.org',
				startDate: `${day(30)}T15:00:00-05:00`,
				endDate: `${day(30)}T17:00:00-05:00`,
				url: expect.stringMatching(/\/#evento-taller-abierto$/),
				location: { '@type': 'Place', name: 'Laboratorio' },
				eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
				organizer: { '@type': 'Organization' },
				inLanguage: 'es',
			});
			// Both modes register on the admin's event page.
			expect(openEvent.offers).toMatchObject({
				url: eventPage(admin, 'taller-abierto'),
				price: '0',
				priceCurrency: 'USD',
			});
			expect(unlEvent.offers).toMatchObject({ url: eventPage(admin, 'charla-unl'), price: '0' });
			expect(unlEvent.location).toMatchObject({ name: 'Auditorio' });
			expect(freeEvent).not.toHaveProperty('offers');
			// Its deadline passed: no registration is offered.
			expect(closedEvent).not.toHaveProperty('offers');
			// The anchors the event and its offer point to exist.
			await expect(card(page, 'taller-abierto')).toHaveCount(1);
			await expect(ticket(page, 'taller-abierto')).toHaveCount(1);
		});

		test('prints the English page in English', async ({ page }) => {
			await open(page, `${site.url}/en/`);
			const events = await ldEvents(page);
			expect(events).toHaveLength(4);
			expect(events.find((data) => data.name === 'Taller abierto')).toMatchObject({
				inLanguage: 'en',
				url: expect.stringMatching(/\/en\/#evento-taller-abierto$/),
			});
		});

		test('every upcoming card has its own anchor and the past one has none', async ({ page }) => {
			await open(page, `${site.url}/`);
			const ids = await page.locator('[id^="evento-"]').evaluateAll((nodes) => nodes.map((node) => node.id));
			expect(ids.sort()).toEqual([
				'evento-charla-unl',
				'evento-sin-extras',
				'evento-taller-abierto',
				'evento-taller-cerrado',
				'evento-taller-libre',
			]);
		});
	});

	test.describe('an older admin', () => {
		test('an admin without the S8 keys builds the same cards with no registration, calendar or Event data', async ({
			page,
		}) => {
			await open(page, `${legacySite.url}/`);
			await expect(card(page, 'taller-abierto')).toHaveCount(1);
			await expect(page.locator('[data-reg], .reg-calendar')).toHaveCount(0);
			expect(await ldEvents(page)).toEqual([]);
		});
	});

	test.describe('links on another origin than the admin', () => {
		test('the build says which events lost their links and shows no registration or calendar for them', async ({
			page,
		}) => {
			expect(foreignOutput).toContain('[registration]');
			expect(foreignOutput).toContain('taller-abierto');
			expect(foreignOutput).toContain('charla-unl');
			expect(foreignOutput).toContain('not on the admin origin');
			expect(mainOutput).not.toContain('not on the admin origin');
			await open(page, `${foreignSite.url}/`);
			await expect(page.locator('[data-reg-action], .reg-calendar')).toHaveCount(0);
			await expect(page.locator('#inscripciones .tk:not(.tk-free)')).toHaveCount(0);
		});

		test('nothing of the foreign host reaches the page, the Event data included', async () => {
			for (const file of ['index.html', 'en/index.html']) {
				expect(await readBuilt(foreignDir, file), file).not.toContain('evil.example.test');
			}
		});
	});

	test.describe('accessibility', () => {
		const BLOCKING = ['serious', 'critical'];

		for (const theme of ['dark', 'light'] as const) {
			test(`the tickets with live, full and closed seats have no serious or critical axe violations (${theme} theme)`, async ({
				page,
			}) => {
				await page.route('**/api/public/events/seats', (route) =>
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						headers: { 'access-control-allow-origin': '*' },
						body: JSON.stringify({
							events: [
								{ slug: 'taller-abierto', capacity: 40, registered: 40, seatsLeft: 0, status: 'full' },
								{ slug: 'charla-unl', capacity: 60, registered: 10, seatsLeft: 50, status: 'closed' },
								{ slug: 'taller-cerrado', capacity: 30, registered: 3, seatsLeft: 27, status: 'open' },
							],
						}),
					}),
				);
				await page.addInitScript((value) => localStorage.setItem('aso-theme', value), theme);
				await open(page, `${site.url}/`);
				await expect(ticket(page, 'taller-abierto').locator('[data-ticket-state]')).toHaveText('Sin cupos');
				const { violations } = await new AxeBuilder({ page }).include('#inscripciones').analyze();
				expect(
					violations
						.filter((violation) => BLOCKING.includes(violation.impact ?? ''))
						.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`),
				).toEqual([]);
			});
		}

		test('every control of the Inscripciones section is at least 44 px tall', async ({ page }) => {
			await open(page, `${site.url}/`);
			const small = await page
				.locator('#inscripciones')
				.locator('a:visible, button:visible')
				.evaluateAll((nodes) =>
					nodes
						.map((node) => ({ node: node.className || node.tagName, height: node.getBoundingClientRect().height }))
						.filter((control) => control.height < 44),
				);
			expect(small).toEqual([]);
		});

		test('the action is reachable and has a focus ring from the keyboard alone', async ({ page }) => {
			await open(page, `${site.url}/`);
			await action(page).focus();
			await expect(action(page)).toBeFocused();
			await expect(action(page)).toHaveCSS('outline-style', 'solid');
		});
	});
});
