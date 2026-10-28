import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
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
	fakeTurnstile,
	serveDirectory,
	startMockAdmin,
	type MockAdmin,
	type RegistrationReply,
	type StaticSite,
	type TurnstileBehavior,
} from './support/admin-site';

// Real builds of the landing against a mock admin that also plays the registration endpoint (S8): the per-event
// registration (UNL link or open form with Turnstile), the .ics link and the Event structured data. One file, serial:
// the builds share Astro's cache, so they must not overlap. Turnstile is faked: no spec reaches Cloudflare.
test.describe.configure({ mode: 'serial' });
test.use({ reducedMotion: 'reduce' });

const SITE_KEY = '1x00000000000000000000AA';
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

const FIELDS = { name: 'Ana Mora', email: 'ana@unl.edu.ec', career: 'Computación', semester: '5' };

const open = async (
	page: Page,
	url: string,
	behavior: TurnstileBehavior = 'solves',
	waitUntil: 'networkidle' | 'load' = 'networkidle',
) => {
	await page.route('https://res.cloudinary.com/**', (route) =>
		route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
	);
	await page.route('https://challenges.cloudflare.com/**', (route) =>
		route.fulfill({ status: 200, contentType: 'text/javascript', body: fakeTurnstile(behavior) }),
	);
	await page.goto(url, { waitUntil });
};

const card = (page: Page, slug: string) => page.locator(`#evento-${slug}`);
// The ticket of an activity in the Inscripciones section: its action unfolds the form that hangs under it.
const ticket = (page: Page, slug: string) => page.locator(`#inscripciones-${slug}`);
const action = (page: Page, slug = 'taller-abierto') => ticket(page, slug).locator('[data-reg-action]');
const openForm = async (page: Page, slug = 'taller-abierto') => {
	await action(page, slug).click();
	await expect(action(page, slug)).toHaveAttribute('aria-expanded', 'true');
	await expect(ticket(page, slug).locator('[data-reg-panel]')).toBeVisible();
	return ticket(page, slug).locator('[data-reg-form]');
};
// Folds and unfolds the form again (the click on the ticket's action toggles it).
const refold = async (page: Page, slug = 'taller-abierto') => {
	await action(page, slug).click();
	await action(page, slug).click();
};
const fillForm = async (form: Locator, values: Partial<typeof FIELDS> = {}) => {
	const all = { ...FIELDS, ...values };
	for (const [name, value] of Object.entries(all)) await form.locator(`[name="${name}"]`).fill(value);
};
type FakeTurnstile = { __turnstile: { token: string | null; renders: number; resets: number; options: unknown } };
// The widget has called back with a token (the fake does it right after rendering, and again after every reset).
const solved = (page: Page, token = 'e2e-turnstile-token-1') =>
	page.waitForFunction((expected) => (window as never as FakeTurnstile).__turnstile?.token === expected, token);

const ldEvents = async (page: Page) => {
	const texts = await page.locator('script[type="application/ld+json"]').allTextContents();
	return texts.map((text) => JSON.parse(text) as Record<string, unknown>).filter((data) => data['@type'] === 'Event');
};

test.describe('registration from the admin', () => {
	let admin: MockAdmin;
	let site: StaticSite;
	let noKeyAdmin: MockAdmin;
	let noKeySite: StaticSite;
	let noKeyOutput = '';
	let mainOutput = '';
	let legacyAdmin: MockAdmin;
	let legacySite: StaticSite;
	let foreignAdmin: MockAdmin;
	let foreignSite: StaticSite;
	let foreignOutput = '';
	let foreignDir = '';
	let mainDir = '';
	let emptyAdmin: MockAdmin;
	let emptySite: StaticSite;

	test.beforeAll(async () => {
		test.setTimeout(420_000);
		admin = await startMockAdmin({ content: registrationContent });
		const built = await buildSite('registration', {
			ADMIN_CONTENT_URL: `${admin.url}/api/public/content`,
			PUBLIC_TURNSTILE_SITE_KEY: SITE_KEY,
		});
		expect(built.exitCode, built.output).toBe(0);
		mainOutput = built.output;
		mainDir = built.outDir;
		site = await serveDirectory(built.outDir);

		// No Turnstile site key: the open form cannot work, so it is not shown, and the build says so.
		noKeyAdmin = await startMockAdmin({ content: registrationContent });
		const noKey = await buildSite('registration-no-key', { ADMIN_CONTENT_URL: `${noKeyAdmin.url}/api/public/content` });
		expect(noKey.exitCode, noKey.output).toBe(0);
		noKeyOutput = noKey.output;
		noKeySite = await serveDirectory(noKey.outDir);

		legacyAdmin = await startMockAdmin({ content: legacyContent });
		const legacy = await buildSite('registration-legacy', {
			ADMIN_CONTENT_URL: `${legacyAdmin.url}/api/public/content`,
			PUBLIC_TURNSTILE_SITE_KEY: SITE_KEY,
		});
		expect(legacy.exitCode, legacy.output).toBe(0);
		legacySite = await serveDirectory(legacy.outDir);

		// Links on another origin than ADMIN_CONTENT_URL's: left out, and the build says so.
		foreignAdmin = await startMockAdmin({ content: foreignContent });
		const foreign = await buildSite('registration-foreign', {
			ADMIN_CONTENT_URL: `${foreignAdmin.url}/api/public/content`,
			PUBLIC_TURNSTILE_SITE_KEY: SITE_KEY,
		});
		expect(foreign.exitCode, foreign.output).toBe(0);
		foreignOutput = foreign.output;
		foreignDir = foreign.outDir;
		foreignSite = await serveDirectory(foreign.outDir);

		// Nothing upcoming: no ticket, so no section and no link to it.
		emptyAdmin = await startMockAdmin({ content: () => payload({ events: [event('viejo', 'Taller viejo', -20)] }) });
		const empty = await buildSite('registration-empty', {
			ADMIN_CONTENT_URL: `${emptyAdmin.url}/api/public/content`,
			PUBLIC_TURNSTILE_SITE_KEY: SITE_KEY,
		});
		expect(empty.exitCode, empty.output).toBe(0);
		emptySite = await serveDirectory(empty.outDir);
	});

	test.afterAll(async () => {
		await Promise.all([
			site?.close(),
			admin?.close(),
			noKeySite?.close(),
			noKeyAdmin?.close(),
			legacySite?.close(),
			legacyAdmin?.close(),
			foreignSite?.close(),
			foreignAdmin?.close(),
			emptySite?.close(),
			emptyAdmin?.close(),
		]);
	});

	test.beforeEach(() => {
		admin.registrationRequests.length = 0;
		admin.registrationReply = { status: 201, body: { ok: true } };
	});

	test.describe('what each ticket shows', () => {
		test('an open-mode ticket has a folded form, the capacity, the deadline and an action that controls it', async ({
			page,
		}) => {
			await open(page, `${site.url}/`);
			const item = ticket(page, 'taller-abierto');
			const button = action(page);
			await expect(button).toHaveText(/Llenar mi boleto/);
			await expect(button).toHaveAttribute('aria-expanded', 'false');
			await expect(button).toHaveAttribute('aria-controls', 'reg-taller-abierto-panel');
			await expect(item.locator('[data-reg-panel]')).toBeHidden();
			await expect(item.locator('[data-seat-num]')).toHaveText('40');
			await expect(item.locator('[data-seat-label]')).toHaveText('cupos');
			await expect(item.locator('[data-seat-meter]')).toBeHidden();
			// The build saw the deadline 20 days away; the days left are counted from the visitor's clock.
			await expect(item.locator('[data-reg-closes]')).toHaveText(/Cierra en (19|20) días/);
			await expect(item).toContainText('hora de Ecuador');
			// Nothing of Turnstile is requested until someone unfolds the form.
			expect(await page.evaluate(() => (window as never as Partial<FakeTurnstile>).__turnstile)).toBeUndefined();
		});

		test('a UNL-mode ticket links to the admin page and has no form', async ({ page }) => {
			await open(page, `${site.url}/`);
			const item = ticket(page, 'charla-unl');
			const link = item.getByRole('link', { name: /Inscribirme con mi cuenta UNL/ });
			await expect(link).toHaveAttribute('href', `${admin.url}/foro/eventos/charla-unl`);
			await expect(link).toHaveAttribute('target', '_blank');
			await expect(link).toHaveAttribute('rel', /noopener/);
			await expect(item.locator('[data-reg-form]')).toHaveCount(0);
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
			await expect(item.locator('[data-reg], [data-reg-action], [data-reg-panel], [data-seat-num]')).toHaveCount(0);
			await expect(item.getByRole('link', { name: /Añadir al calendario/ })).toHaveAttribute(
				'href',
				calendar(admin.url, 'taller-libre'),
			);
			// A free pass has no seats: the script that paints them never looks for it.
			await expect(item).not.toHaveAttribute('data-ticket', /.+/);
		});

		test('a ticket whose deadline passed says so, with its action disabled and no form', async ({ page }) => {
			await open(page, `${site.url}/`);
			const item = ticket(page, 'taller-cerrado');
			await expect(item.locator('[data-ticket-state]')).toHaveText('Inscripciones cerradas');
			await expect(action(page, 'taller-cerrado')).toBeDisabled();
			await expect(item.locator('[data-reg-panel], [data-reg-form]')).toHaveCount(0);
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
			await expect(action(page)).toBeDisabled();
			await expect(item.locator('[data-reg-panel]')).toBeHidden();
			await expect(item.locator('[data-reg-extra]')).toBeHidden();
		});

		test('speaks English on the English home', async ({ page }) => {
			await open(page, `${site.url}/en/`);
			const item = ticket(page, 'taller-abierto');
			await expect(item.getByRole('heading', { level: 3 })).toHaveText('Taller abierto');
			await expect(item).toContainText('Ticket 001');
			await expect(item).toContainText('With a form');
			await expect(action(page)).toHaveText(/Fill in my ticket/);
			await expect(item.locator('[data-seat-label]')).toHaveText('seats');
			await expect(item).toContainText('Ecuador time');
			await expect(ticket(page, 'taller-libre').getByRole('link', { name: /Add to calendar/ })).toBeVisible();
			await expect(ticket(page, 'charla-unl').getByRole('link', { name: /Sign up with my UNL account/ })).toBeVisible();
			const form = await openForm(page);
			await expect(form.getByLabel('Full name')).toBeVisible();
			await expect(form.getByRole('button', { name: 'Send registration' })).toBeVisible();
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
			await expect(page.locator('li.commit [data-reg-form], li.commit [data-reg-panel]')).toHaveCount(0);
			await expect(page.locator('[data-reg-form]')).toHaveCount(1);
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

		test('unfolds the form under its ticket and "Cerrar" folds it and returns focus to the action', async ({
			page,
		}) => {
			await open(page, `${site.url}/`);
			const item = ticket(page, 'taller-abierto');
			const panel = item.locator('[data-reg-panel]');
			await action(page).click();
			await expect(action(page)).toHaveAttribute('aria-expanded', 'true');
			await expect(panel).toBeVisible();
			await solved(page);
			await panel.getByRole('button', { name: 'Cerrar' }).click();
			await expect(action(page)).toHaveAttribute('aria-expanded', 'false');
			await expect(panel).toBeHidden();
			await expect(action(page)).toBeFocused();
			// Unfolding again is the same form: nothing is rendered twice.
			await action(page).click();
			await expect(panel).toBeVisible();
			expect(await page.evaluate(() => (window as never as FakeTurnstile).__turnstile.renders)).toBe(1);
		});

		test('without JavaScript the open form is shown expanded and cannot be sent', async ({ browser }) => {
			const context = await browser.newContext({ javaScriptEnabled: false });
			const page = await context.newPage();
			await page.route('https://res.cloudinary.com/**', (route) =>
				route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
			);
			await page.goto(`${site.url}/`);
			const item = ticket(page, 'taller-abierto');
			await expect(item.locator('[data-reg-panel]')).toBeVisible();
			await expect(item.getByLabel('Nombre completo')).toBeVisible();
			await expect(item.locator('noscript .reg-note')).toContainText('Activa JavaScript para inscribirte desde aquí.');
			await expect(item.getByRole('button', { name: 'Enviar inscripción' })).toBeDisabled();
			// What only works with JavaScript is not offered.
			await expect(action(page)).toBeHidden();
			await expect(item.getByRole('button', { name: 'Cerrar' })).toBeHidden();
			await expect(
				ticket(page, 'charla-unl').getByRole('link', { name: /Inscribirme con mi cuenta UNL/ }),
			).toBeVisible();
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
			// Still open: the action works and the form unfolds.
			await expect(action(page)).toBeEnabled();
			await openForm(page);
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

		test('a full event says "Sin cupos", disables the action and does not offer the form', async ({ page }) => {
			await page.route(SEATS, (route) => route.fulfill(answer([seatsOf('taller-abierto', 40, 40, 'full')])));
			await open(page, `${site.url}/`);
			const item = ticket(page, 'taller-abierto');
			await expect(item.locator('[data-ticket-state]')).toHaveText('Sin cupos');
			await expect(item.locator('[data-seat-num]')).toHaveText('0');
			await expect(action(page)).toBeDisabled();
			await expect(item.locator('[data-reg-panel]')).toBeHidden();
			await expect(item.locator('[data-reg-extra]')).toBeHidden();
		});

		test('a full form that was already unfolded is taken away when the answer arrives', async ({ page }) => {
			let release: () => void = () => {};
			const gate = new Promise<void>((resolve) => (release = resolve));
			await page.route(SEATS, async (route) => {
				await gate;
				await route.fulfill(answer([seatsOf('taller-abierto', 40, 40, 'full')]));
			});
			await open(page, `${site.url}/`, 'solves', 'load');
			await expect(page.locator('[data-reg-submit]')).toBeEnabled();
			await openForm(page);
			release();
			await expect(ticket(page, 'taller-abierto').locator('[data-ticket-state]')).toHaveText('Sin cupos');
			await expect(ticket(page, 'taller-abierto').locator('[data-reg-panel]')).toBeHidden();
			await expect(action(page)).toBeDisabled();
		});

		test('a closed event says "Inscripciones cerradas" and its UNL link goes nowhere', async ({ page }) => {
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
			await expect(item.locator('[data-reg-action]')).toHaveAttribute('href', /charla-unl/);
		});

		test('an answer that does not match the contract changes nothing', async ({ page }) => {
			await page.route(SEATS, (route) =>
				route.fulfill(answer([{ slug: 'taller-abierto', capacity: 'muchos', registered: 1, status: 'open' }, null])),
			);
			await open(page, `${site.url}/`);
			await expect(ticket(page, 'taller-abierto').locator('[data-seat-num]')).toHaveText('40');
			await expect(action(page)).toBeEnabled();
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
				await expect(action(page)).toBeEnabled();
				await openForm(page);
				await expect(
					ticket(page, 'charla-unl').getByRole('link', { name: /Inscribirme con mi cuenta UNL/ }),
				).toHaveAttribute('href', /charla-unl/);
			});
		}

		test('a ticket keeps its height when its seats arrive', async ({ page }) => {
			const height = () => ticket(page, 'taller-abierto').evaluate((node) => node.getBoundingClientRect().height);
			let answerSeats: (() => void) | undefined;
			await page.route(SEATS, (route) => {
				answerSeats = () => void route.fulfill(answer([seatsOf('taller-abierto', 40, 38)])).catch(() => {});
			});
			await open(page, `${site.url}/`, 'solves', 'load');
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

		test('when the admin is slow the ticket keeps its capacity and the form still works, and a late answer is ignored', async ({
			page,
		}) => {
			test.setTimeout(30_000);
			let late: (() => void) | undefined;
			await page.route(SEATS, (route) => {
				late = () => void route.fulfill(answer([seatsOf('taller-abierto', 40, 40, 'full')])).catch(() => {});
			});
			await open(page, `${site.url}/`);
			const form = await openForm(page);
			await solved(page);
			await fillForm(form);
			await form.getByRole('button', { name: 'Enviar inscripción' }).click();
			await expect(form.locator('[data-reg-ok]')).toHaveText(/quedó registrada/);
			// `open` waited for the network to be idle, which only happens once the request gave up (4 s).
			late?.();
			await page.waitForTimeout(300);
			await expect(ticket(page, 'taller-abierto').locator('[data-seat-num]')).toHaveText('40');
			await expect(ticket(page, 'taller-abierto').locator('[data-ticket-state]')).toBeHidden();
		});
	});

	test.describe('the open form', () => {
		for (const theme of ['dark', 'light'] as const) {
			test(`renders the Turnstile widget in the ${theme} theme`, async ({ page }) => {
				await page.addInitScript((value) => localStorage.setItem('aso-theme', value), theme);
				await open(page, `${site.url}/`);
				await openForm(page);
				await solved(page);
				expect(await page.evaluate(() => (window as never as FakeTurnstile).__turnstile.options)).toMatchObject({
					theme,
				});
			});
		}

		test('loads Turnstile only when opened and renders it with the site key and the language', async ({ page }) => {
			const requests: string[] = [];
			page.on('request', (request) => {
				if (request.url().startsWith('https://challenges.cloudflare.com/')) requests.push(request.url());
			});
			await open(page, `${site.url}/`);
			expect(requests).toEqual([]);
			await openForm(page);
			await solved(page);
			expect(requests).toHaveLength(1);
			expect(requests[0]).toContain('render=explicit');
			expect(await page.evaluate(() => (window as never as FakeTurnstile).__turnstile.options)).toEqual({
				sitekey: SITE_KEY,
				theme: expect.stringMatching(/^(dark|light)$/),
				language: 'es',
			});
			// Closing and opening again does not draw a second widget.
			await refold(page);
			expect(await page.evaluate(() => (window as never as FakeTurnstile).__turnstile.renders)).toBe(1);
		});

		test('has a labelled field for each datum, a title that names the event and the privacy note', async ({ page }) => {
			await open(page, `${site.url}/`);
			const form = await openForm(page);
			await expect(form).toHaveAccessibleName('Inscripción a Taller abierto');
			for (const label of ['Nombre completo', 'Correo electrónico', 'Carrera', 'Semestre (1 a 12)']) {
				await expect(form.getByLabel(label)).toBeVisible();
			}
			await expect(form.getByLabel('Correo electrónico')).toHaveAttribute('type', 'email');
			await expect(form.getByLabel('Correo electrónico')).toHaveAttribute('autocomplete', 'email');
			await expect(form).toContainText('90 días');
			await expect(form.getByRole('group', { name: 'Verificación de seguridad' })).toBeVisible();
		});

		test('posts the data and the Turnstile token as JSON to the admin endpoint and confirms', async ({ page }) => {
			await open(page, `${site.url}/`);
			const form = await openForm(page);
			await solved(page);
			await fillForm(form, { name: '  Ana Mora  ' });
			await form.getByRole('button', { name: 'Enviar inscripción' }).click();

			const ok = form.locator('[data-reg-ok]');
			await expect(ok).toHaveText(/Tu inscripción quedó registrada/);
			await expect(ok).toBeFocused();
			expect(admin.registrationRequests).toEqual([
				{
					slug: 'taller-abierto',
					origin: site.url,
					contentType: 'application/json',
					body: {
						name: 'Ana Mora',
						email: 'ana@unl.edu.ec',
						career: 'Computación',
						semester: 5,
						turnstileToken: 'e2e-turnstile-token-1',
					},
				},
			]);
			// Done: only the confirmation stays, so it cannot be sent twice by accident.
			await expect(form.getByRole('button', { name: 'Enviar inscripción' })).toBeHidden();
			await expect(form.getByLabel('Nombre completo')).toBeHidden();
		});

		test('asks for a new Turnstile token after every attempt', async ({ page }) => {
			admin.registrationReply = { status: 409, body: { error: 'duplicate' } };
			await open(page, `${site.url}/`);
			const form = await openForm(page);
			await solved(page);
			await fillForm(form);
			const send = form.getByRole('button', { name: 'Enviar inscripción' });
			await send.click();
			await expect(form.locator('[data-reg-error]')).toHaveText(/Ya hay una inscripción/);
			await expect.poll(() => admin.registrationRequests.length).toBe(1);
			await expect.poll(() => page.evaluate(() => (window as never as FakeTurnstile).__turnstile.resets)).toBe(1);
			await solved(page, 'e2e-turnstile-token-2');
			await send.click();
			await expect.poll(() => admin.registrationRequests.length).toBe(2);
			expect((admin.registrationRequests[1].body as { turnstileToken: string }).turnstileToken).toBe(
				'e2e-turnstile-token-2',
			);
		});

		test('checks the fields first: names the wrong one, marks it and sends nothing', async ({ page }) => {
			await open(page, `${site.url}/`);
			const form = await openForm(page);
			await solved(page);
			const send = form.getByRole('button', { name: 'Enviar inscripción' });

			await send.click();
			await expect(form.getByLabel('Nombre completo')).toBeFocused();
			await expect(form.getByLabel('Nombre completo')).toHaveAttribute('aria-invalid', 'true');
			await expect(form.getByLabel('Nombre completo')).toHaveAccessibleDescription(/Escribe tu nombre completo/);

			await fillForm(form, { email: 'no-es-un-correo', semester: '13' });
			await send.click();
			await expect(form.getByLabel('Correo electrónico')).toBeFocused();
			await expect(form.getByLabel('Correo electrónico')).toHaveAccessibleDescription(/correo electrónico válido/);

			await form.getByLabel('Correo electrónico').fill('ana@unl.edu.ec');
			await expect(form.getByLabel('Correo electrónico')).not.toHaveAttribute('aria-invalid', 'true');
			await send.click();
			await expect(form.getByLabel('Semestre (1 a 12)')).toBeFocused();
			await expect(form.getByLabel('Semestre (1 a 12)')).toHaveAccessibleDescription(/entre 1 y 12/);
			expect(admin.registrationRequests).toEqual([]);
		});

		test('does not send until the person passed the Turnstile check', async ({ page }) => {
			await open(page, `${site.url}/`, 'never');
			const form = await openForm(page);
			await fillForm(form);
			await form.getByRole('button', { name: 'Enviar inscripción' }).click();
			await expect(form.locator('[data-reg-error]')).toHaveText(/verificación de seguridad/);
			expect(admin.registrationRequests).toEqual([]);
		});

		test('says so when the Turnstile widget reports an error or its script is blocked', async ({ page }) => {
			await open(page, `${site.url}/`, 'fails');
			const form = await openForm(page);
			await expect(form.locator('[data-reg-error]')).toHaveText(/verificación de seguridad/);

			const blocked = await page.context().newPage();
			await blocked.route('https://res.cloudinary.com/**', (route) =>
				route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
			);
			await blocked.route('https://challenges.cloudflare.com/**', (route) => route.abort());
			await blocked.goto(`${site.url}/`, { waitUntil: 'networkidle' });
			const blockedForm = await openForm(blocked);
			await expect(blockedForm.locator('[data-reg-error]')).toHaveText(/verificación de seguridad/);
			await blocked.close();
		});

		test('a second form attempt after the Turnstile script failed tries to load it again', async ({ page }) => {
			let attempts = 0;
			await page.route('https://res.cloudinary.com/**', (route) =>
				route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
			);
			await page.route('https://challenges.cloudflare.com/**', (route) => {
				attempts += 1;
				return attempts === 1
					? route.abort()
					: route.fulfill({ status: 200, contentType: 'text/javascript', body: fakeTurnstile('solves') });
			});
			await page.goto(`${site.url}/`, { waitUntil: 'networkidle' });
			const form = await openForm(page);
			await expect(form.locator('[data-reg-error]')).toHaveText(/verificación de seguridad/);
			await refold(page);
			await solved(page);
			expect(attempts).toBe(2);
		});

		test.describe('every answer of the endpoint', () => {
			// [name, reply, message shown, whether the form gives way to the message]
			const refusals: [string, RegistrationReply, RegExp, boolean][] = [
				['duplicate', { status: 409, body: { error: 'duplicate' } }, /Ya hay una inscripción con ese correo/, false],
				['full', { status: 409, body: { error: 'full' } }, /Ya no quedan cupos/, true],
				[
					'closed',
					{ status: 409, body: { error: 'closed' } },
					/Las inscripciones para esta actividad ya cerraron/,
					true,
				],
				['not found', { status: 404, body: { error: 'not_found' } }, /ya no recibe inscripciones/, true],
				[
					'rate limited',
					{ status: 429, body: { error: 'rate_limited' }, headers: { 'retry-after': '600' } },
					/demasiados intentos/,
					false,
				],
				['unavailable', { status: 503, body: { error: 'unavailable' } }, /no está disponible en este momento/, false],
				['captcha rejected', { status: 400, body: { error: 'captcha' } }, /verificación de seguridad/, false],
				['too large', { status: 413, body: { error: 'too_large' } }, /No pudimos enviar tu inscripción/, false],
				['bad request', { status: 400, body: { error: 'bad_request' } }, /No pudimos enviar tu inscripción/, false],
			];

			for (const [name, reply, message, ends] of refusals) {
				test(`${name} (HTTP ${reply.status}) shows its message${ends ? ' and ends the form' : ' and lets the person try again'}`, async ({
					page,
				}) => {
					admin.registrationReply = reply;
					await open(page, `${site.url}/`);
					const form = await openForm(page);
					await solved(page);
					await fillForm(form);
					await form.getByRole('button', { name: 'Enviar inscripción' }).click();

					const error = form.locator('[data-reg-error]');
					await expect(error).toHaveText(message);
					await expect(error).toHaveAttribute('role', 'alert');
					await expect(form.locator('[data-reg-ok]')).toBeEmpty();
					const send = form.getByRole('button', { name: 'Enviar inscripción' });
					if (ends) {
						await expect(send).toBeHidden();
						await expect(error).toBeFocused();
					} else {
						await expect(send).toBeVisible();
						await expect(send).not.toHaveAttribute('aria-disabled', 'true');
						// The data is still there to try again.
						await expect(form.getByLabel('Nombre completo')).toHaveValue('Ana Mora');
					}
				});
			}

			for (const field of ['name', 'email', 'career', 'semester'] as const) {
				test(`a validation error on ${field} marks that field and moves focus to it`, async ({ page }) => {
					admin.registrationReply = { status: 400, body: { error: 'validation', field } };
					await open(page, `${site.url}/`);
					const form = await openForm(page);
					await solved(page);
					await fillForm(form);
					await form.getByRole('button', { name: 'Enviar inscripción' }).click();
					const input = form.locator(`[name="${field}"]`);
					await expect(input).toBeFocused();
					await expect(input).toHaveAttribute('aria-invalid', 'true');
					await expect(form.locator(`[data-reg-field-error="${field}"]`)).not.toBeEmpty();
				});
			}

			test('a request that never reaches the admin says so', async ({ page }) => {
				await page.route(`${admin.url}/api/public/events/**`, (route) => route.abort());
				await open(page, `${site.url}/`);
				const form = await openForm(page);
				await solved(page);
				await fillForm(form);
				await form.getByRole('button', { name: 'Enviar inscripción' }).click();
				await expect(form.locator('[data-reg-error]')).toHaveText(/No pudimos conectarnos/);
				await expect(form.getByRole('button', { name: 'Enviar inscripción' })).toBeVisible();
			});

			test('a second click while the first is in flight does not send twice', async ({ page }) => {
				let release: () => void = () => {};
				const gate = new Promise<void>((resolve) => (release = resolve));
				await page.route(`${admin.url}/api/public/events/**`, async (route) => {
					await gate;
					await route.continue();
				});
				await open(page, `${site.url}/`);
				const form = await openForm(page);
				await solved(page);
				await fillForm(form);
				const send = form.getByRole('button', { name: 'Enviar inscripción' });
				await send.click();
				const sending = form.getByRole('button', { name: 'Enviando…' });
				await expect(sending).toHaveAttribute('aria-disabled', 'true');
				await expect(form).toHaveAttribute('aria-busy', 'true');
				await sending.click();
				release();
				await expect(form.locator('[data-reg-ok]')).toHaveText(/quedó registrada/);
				expect(admin.registrationRequests).toHaveLength(1);
			});
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
			// The open form hangs under the activity's ticket; the UNL one is a page on the admin.
			expect(openEvent.offers).toMatchObject({
				url: expect.stringMatching(/\/#inscripciones-taller-abierto$/),
				price: '0',
				priceCurrency: 'USD',
			});
			expect(unlEvent.offers).toMatchObject({ url: `${admin.url}/foro/eventos/charla-unl`, price: '0' });
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

	test.describe('older admin and missing Turnstile key', () => {
		test('an admin without the S8 keys builds the same cards with no registration, calendar or Event data', async ({
			page,
		}) => {
			await open(page, `${legacySite.url}/`);
			await expect(card(page, 'taller-abierto')).toHaveCount(1);
			await expect(page.locator('[data-reg], .reg-calendar, [data-reg-form]')).toHaveCount(0);
			expect(await ldEvents(page)).toEqual([]);
		});

		test('without PUBLIC_TURNSTILE_SITE_KEY the open form is not shown, the build says so and UNL mode still works', async ({
			page,
		}) => {
			expect(noKeyOutput).toContain('PUBLIC_TURNSTILE_SITE_KEY is not set');
			expect(noKeyOutput).toContain('taller-abierto');
			expect(mainOutput).not.toContain('PUBLIC_TURNSTILE_SITE_KEY is not set');
			await open(page, `${noKeySite.url}/`);
			await expect(page.locator('[data-reg-panel], [data-reg-form]')).toHaveCount(0);
			// The activity keeps its card and its calendar link, but has no ticket (it is not free either) and nothing links to one.
			await expect(card(page, 'taller-abierto').getByRole('link', { name: /Añadir al calendario/ })).toBeVisible();
			await expect(ticket(page, 'taller-abierto')).toHaveCount(0);
			await expect(card(page, 'taller-abierto').getByRole('link', { name: /Ver el boleto/ })).toHaveCount(0);
			await expect(
				ticket(page, 'charla-unl').getByRole('link', { name: /Inscribirme con mi cuenta UNL/ }),
			).toBeVisible();
			// The Event data cannot promise a form that is not there, but the UNL registration is still offered.
			const events = await ldEvents(page);
			expect(events).toHaveLength(4);
			expect(events.find((data) => data.name === 'Taller abierto')).not.toHaveProperty('offers');
			expect(events.find((data) => data.name === 'Charla con cuenta UNL')).toHaveProperty('offers');
		});
	});

	test.describe('the form can never leak what was typed', () => {
		const chunk = /\/_astro\/registration\.[\w-]+\.js/;

		test('the server-rendered form is method=post with a disabled submit and no native submit', async () => {
			const html = await readBuilt(mainDir, 'index.html');
			const forms = html.match(/<form\b[^>]*data-reg-form[^>]*>/g) ?? [];
			expect(forms).toHaveLength(1);
			expect(forms[0]).toMatch(/\bmethod="post"/i);
			expect(forms[0]).not.toMatch(/\baction=/i);
			expect(forms[0]).toMatch(/\bonsubmit="return false"/);
			expect(html.match(/<button\b[^>]*data-reg-submit[^>]*>/)?.[0]).toMatch(/\bdisabled\b/);
		});

		test('the submit button is enabled once the script has attached its handler', async ({ page }) => {
			await open(page, `${site.url}/`);
			const form = await openForm(page);
			await expect(form.getByRole('button', { name: 'Enviar inscripción' })).toBeEnabled();
		});

		test('with the script blocked, Enter and a forced submit put nothing in the URL and send no request', async ({
			page,
		}) => {
			const chunkRequests: string[] = [];
			await page.route(chunk, (route) => {
				chunkRequests.push(route.request().url());
				return route.abort();
			});
			const sent: string[] = [];
			await open(page, `${site.url}/`);
			page.on('request', (request) => {
				if (request.method() !== 'GET' || /ana|unl\.edu|Computaci/.test(request.url())) sent.push(request.url());
			});
			const before = page.url();
			// Without its script the action does nothing and the form stays folded: take the `js` class away to look at the
			// form as the page ships it, which is also what a browser without JavaScript shows.
			await page.evaluate(() => document.documentElement.classList.remove('js'));
			const form = ticket(page, 'taller-abierto').locator('[data-reg-form]');
			await expect(form).toBeVisible();
			await fillForm(form);
			const send = form.getByRole('button', { name: 'Enviar inscripción' });
			// The handler never attached, so nothing enabled the button.
			await expect(send).toBeDisabled();
			expect(chunkRequests.length).toBeGreaterThan(0);

			// Enter in a field is implicit submission: a disabled default button blocks it.
			await form.getByLabel('Carrera').press('Enter');
			// Even a script (or an extension) asking the form to submit does not navigate.
			await form.evaluate((node) => (node as HTMLFormElement).requestSubmit());
			await page.waitForTimeout(500);

			expect(page.url()).toBe(before);
			expect(page.url()).not.toContain('?');
			expect(sent).toEqual([]);
			expect(admin.registrationRequests).toEqual([]);
			await expect(form.getByLabel('Nombre completo')).toHaveValue('Ana Mora');
		});

		test('with the Turnstile script blocked the form still cannot submit natively either', async ({ page }) => {
			await open(page, `${site.url}/`);
			await page.route('https://challenges.cloudflare.com/**', (route) => route.abort());
			const before = page.url();
			const form = await openForm(page);
			await fillForm(form);
			await form.getByLabel('Carrera').press('Enter');
			expect(page.url()).toBe(before);
			expect(admin.registrationRequests).toEqual([]);
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
			await expect(page.locator('[data-reg-panel], [data-reg-form], [data-reg-action], .reg-calendar')).toHaveCount(0);
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
			for (const path of ['/', '/en/']) {
				test(`${path} with the form open and an error showing has no serious or critical axe violations (${theme} theme)`, async ({
					page,
				}) => {
					admin.registrationReply = { status: 409, body: { error: 'duplicate' } };
					await page.addInitScript((value) => localStorage.setItem('aso-theme', value), theme);
					await open(page, `${site.url}${path}`);
					const form = await openForm(page);
					await solved(page);
					const es = path === '/';
					await fillForm(form);
					await form.getByRole('button', { name: es ? 'Enviar inscripción' : 'Send registration' }).click();
					await expect(form.locator('[data-reg-error]')).not.toBeEmpty();
					const { violations } = await new AxeBuilder({ page }).analyze();
					expect(
						violations
							.filter((violation) => BLOCKING.includes(violation.impact ?? ''))
							.map(
								(violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`,
							),
					).toEqual([]);
				});
			}
		}

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
			await openForm(page);
			const small = await page
				.locator('#inscripciones')
				.locator('a:visible, button:visible, input:visible')
				.evaluateAll((nodes) =>
					nodes
						.map((node) => ({ node: node.className || node.tagName, height: node.getBoundingClientRect().height }))
						.filter((control) => control.height < 44),
				);
			expect(small).toEqual([]);
		});

		test('works from the keyboard alone: Enter unfolds the form, Tab reaches "Cerrar", every field and the button', async ({
			page,
		}) => {
			await open(page, `${site.url}/`);
			await action(page).focus();
			await page.keyboard.press('Enter');
			const form = ticket(page, 'taller-abierto').locator('[data-reg-form]');
			await expect(form).toBeVisible();
			await page.keyboard.press('Tab');
			await expect(ticket(page, 'taller-abierto').getByRole('button', { name: 'Cerrar' })).toBeFocused();
			for (const label of ['Nombre completo', 'Correo electrónico', 'Carrera', 'Semestre (1 a 12)']) {
				await page.keyboard.press('Tab');
				await expect(form.getByLabel(label)).toBeFocused();
			}
		});
	});
});
