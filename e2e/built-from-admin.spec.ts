import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { impactStat, payload, sponsor, testimonial } from '../src/lib/admin-content/test-fixtures';
import {
	PIXEL,
	buildSite,
	serveDirectory,
	startMockAdmin,
	type MockAdmin,
	type StaticSite,
} from './support/admin-site';

// Real builds of the landing against a mock admin (e2e/support/admin-site.ts). One file, serial: the builds share
// Astro's cache, so they must not overlap. Social-proof sections (S9) here; the preview mode (S6) below.
test.describe.configure({ mode: 'serial' });

const socialProof = () =>
	payload({
		impact: [impactStat(), impactStat({ value: '3 años', label: 'de trayectoria' })],
		testimonials: [testimonial(), testimonial({ name: 'Ana Mora', role: 'Egresada', photo: null })],
		sponsors: [sponsor(), sponsor({ name: 'Sin enlace', url: null })],
	});

// A page from a build, with the images answered locally.
const open = async (page: Page, url: string) => {
	await page.route('https://res.cloudinary.com/**', (route) =>
		route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
	);
	await page.goto(url, { waitUntil: 'networkidle' });
};

const BLOCKING = ['serious', 'critical'];
const blockingViolations = async (page: Page) => {
	const { violations } = await new AxeBuilder({ page }).analyze();
	return violations
		.filter((violation) => BLOCKING.includes(violation.impact ?? ''))
		.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`);
};

test.describe('social proof from the admin', () => {
	let admin: MockAdmin;
	let site: StaticSite;
	let emptyAdmin: MockAdmin;
	let emptySite: StaticSite;

	test.beforeAll(async () => {
		test.setTimeout(240_000);
		admin = await startMockAdmin({ content: socialProof() });
		const built = await buildSite('social-proof', { ADMIN_CONTENT_URL: `${admin.url}/api/public/content` });
		expect(built.exitCode, built.output).toBe(0);
		site = await serveDirectory(built.outDir);

		// An admin that does not send the three keys yet (the API before S9): the same build, nothing to show.
		const { impact: _a, testimonials: _b, sponsors: _c, ...old } = socialProof();
		emptyAdmin = await startMockAdmin({ content: old });
		const empty = await buildSite('no-social-proof', { ADMIN_CONTENT_URL: `${emptyAdmin.url}/api/public/content` });
		expect(empty.exitCode, empty.output).toBe(0);
		emptySite = await serveDirectory(empty.outDir);
	});

	test.afterAll(async () => {
		await Promise.all([site?.close(), admin?.close(), emptySite?.close(), emptyAdmin?.close()]);
	});

	test('renders the impact figures, the testimonials and the allies in Spanish', async ({ page }) => {
		await open(page, `${site.url}/`);

		const impact = page.locator('#impacto');
		await expect(impact.getByRole('heading', { name: 'Impacto' })).toBeVisible();
		await expect(impact.locator('.impact-stat')).toHaveCount(2);
		await expect(impact.locator('.impact-stat').first()).toContainText('120+');
		await expect(impact.locator('.impact-stat').first()).toContainText('estudiantes en nuestras actividades');

		const quotes = page.locator('#testimonios');
		await expect(quotes.getByRole('heading', { name: 'Testimonios' })).toBeVisible();
		await expect(quotes.locator('.quote')).toHaveCount(2);
		await expect(quotes.locator('.quote').first().locator('blockquote')).toContainText('Aprendí Git en un taller');
		await expect(quotes.locator('.quote').first().locator('img')).toHaveAttribute('alt', 'Retrato de Luis Torres');
		await expect(quotes.locator('.quote').nth(1).locator('img')).toHaveCount(0);
		await expect(quotes.locator('.quote').nth(1)).toContainText('Egresada');

		const allies = page.locator('#aliados');
		await expect(allies.getByRole('heading', { name: 'Aliados' })).toBeVisible();
		await expect(allies.locator('.ally')).toHaveCount(2);
		const link = allies.locator('a.ally-tile');
		await expect(link).toHaveCount(1);
		await expect(link).toHaveAttribute('href', 'https://ejemplo.test/');
		await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
		await expect(link.locator('img')).toHaveAttribute('alt', 'Logo de Ejemplo S.A.');
		await expect(allies.locator('.ally').nth(1).locator('img')).toHaveAttribute('alt', 'Logo de Ejemplo S.A.');
	});

	test('speaks English on the English home', async ({ page }) => {
		await open(page, `${site.url}/en/`);
		await expect(page.locator('#impacto').getByRole('heading', { name: 'Impact' })).toBeVisible();
		await expect(page.locator('#testimonios').getByRole('heading', { name: 'Testimonials' })).toBeVisible();
		await expect(page.locator('#aliados').getByRole('heading', { name: 'Allies' })).toBeVisible();
	});

	test('hides every section when the admin has nothing for it (an API without the keys)', async ({ page }) => {
		await open(page, `${emptySite.url}/`);
		for (const id of ['impacto', 'testimonios', 'aliados']) await expect(page.locator(`#${id}`)).toHaveCount(0);
		await expect(page.locator('#directiva')).toBeVisible();
	});

	test('shows no social proof on the committed fallback build either', async ({ page }) => {
		await page.goto('/');
		for (const id of ['impacto', 'testimonios', 'aliados']) await expect(page.locator(`#${id}`)).toHaveCount(0);
	});

	test.describe('reduced motion', () => {
		test.use({ reducedMotion: 'reduce' });

		for (const theme of ['dark', 'light'] as const) {
			for (const path of ['/', '/en/']) {
				test(`${path} has no serious or critical axe violations with the sections (${theme} theme)`, async ({
					page,
				}) => {
					await page.addInitScript((value) => localStorage.setItem('aso-theme', value), theme);
					await open(page, `${site.url}${path}`);
					await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
					await expect(page.locator('#aliados')).toBeVisible();
					expect(await blockingViolations(page)).toEqual([]);
				});
			}
		}

		test('the sections sit still: no transform or opacity is applied to them', async ({ page }) => {
			await open(page, `${site.url}/`);
			await expect(page.locator('html')).not.toHaveClass(/\bmotion\b/);
			for (const selector of ['.impact-stat', '.quote', '.ally-tile']) {
				const style = await page
					.locator(selector)
					.first()
					.evaluate((node) => {
						const { opacity, transform } = getComputedStyle(node);
						return { opacity, transform };
					});
				expect(style, selector).toEqual({ opacity: '1', transform: 'none' });
			}
		});
	});
});
