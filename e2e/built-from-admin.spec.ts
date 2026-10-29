import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { impactStat, newsItem, payload, sponsor, testimonial } from '../src/lib/admin-content/test-fixtures';
import {
	PIXEL,
	TOKEN,
	buildSite,
	exists,
	readBuilt,
	serveDirectory,
	startMockAdmin,
	type MockAdmin,
	type StaticSite,
} from './support/admin-site';

// Real builds of the landing against a mock admin (e2e/support/admin-site.ts): the social-proof sections (S9) and the
// preview mode (S6). One file, serial: the builds share Astro's cache, so they must not overlap.
test.describe.configure({ mode: 'serial' });

const socialProof = () =>
	payload({
		impact: [impactStat(), impactStat({ value: '3 años', label: 'de trayectoria' })],
		testimonials: [testimonial(), testimonial({ name: 'Ana Mora', role: 'Egresada', photo: null })],
		sponsors: [sponsor(), sponsor({ name: 'Sin enlace', url: null })],
	});
const draft = newsItem({ slug: 'borrador-sin-publicar', title: 'Borrador sin publicar' });
const previewDocument = () => ({ ...socialProof(), news: [draft], schemaVersion: 1, preview: true });

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

	test('renders the allies in Spanish and never the impact figures or testimonials the admin still sends', async ({
		page,
	}) => {
		await open(page, `${site.url}/`);

		await expect(page.locator('#impacto')).toHaveCount(0);
		await expect(page.locator('#testimonios')).toHaveCount(0);

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
			for (const selector of ['.ally-tile']) {
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

test.describe('preview build', () => {
	let admin: MockAdmin;
	let site: StaticSite;
	let outDir: string;
	let normalAdmin: MockAdmin;
	let normalSite: StaticSite;
	let normalOutDir: string;

	test.beforeAll(async () => {
		test.setTimeout(240_000);
		admin = await startMockAdmin({ content: socialProof(), preview: previewDocument() });
		const built = await buildSite('preview', {
			PREVIEW_BUILD: '1',
			PREVIEW_TOKEN: TOKEN,
			ADMIN_PREVIEW_URL: `${admin.url}/api/public/preview`,
			// The content endpoint is also configured: a preview build must read the preview one only.
			ADMIN_CONTENT_URL: `${admin.url}/api/public/content`,
			PUBLIC_CF_BEACON_TOKEN: 'beacon-token',
		});
		expect(built.exitCode, built.output).toBe(0);
		outDir = built.outDir;
		site = await serveDirectory(outDir);

		// A normal build that still has the token and the preview URL around: it must ignore them.
		normalAdmin = await startMockAdmin({ content: socialProof(), preview: previewDocument() });
		const normal = await buildSite('normal-with-token', {
			PREVIEW_TOKEN: TOKEN,
			ADMIN_PREVIEW_URL: `${normalAdmin.url}/api/public/preview`,
			ADMIN_CONTENT_URL: `${normalAdmin.url}/api/public/content`,
			PUBLIC_CF_BEACON_TOKEN: 'beacon-token',
		});
		expect(normal.exitCode, normal.output).toBe(0);
		normalOutDir = normal.outDir;
		normalSite = await serveDirectory(normalOutDir);
	});

	test.afterAll(async () => {
		await Promise.all([site?.close(), admin?.close(), normalSite?.close(), normalAdmin?.close()]);
	});

	test('fetches the preview with the token header and never the public content', async () => {
		expect(admin.previewTokens).toEqual([TOKEN]);
		expect(admin.contentRequests).toBe(0);
	});

	test('shows the banner on every page, in Spanish and in English', async ({ page }) => {
		for (const [path, text] of [
			['/', 'Vista previa — no publicar'],
			['/novedades/', 'Vista previa — no publicar'],
			['/en/', 'Preview — do not publish'],
		]) {
			await open(page, `${site.url}${path}`);
			const banner = page.locator('[data-preview-banner]');
			await expect(banner).toBeVisible();
			await expect(banner).toContainText(text);
		}
	});

	test('is never indexed: noindex meta, robots.txt, X-Robots-Tag header file and no sitemap', async ({ page }) => {
		await open(page, `${site.url}/`);
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
		expect(await readBuilt(outDir, 'robots.txt')).toBe('User-agent: *\nDisallow: /\n');
		expect(await readBuilt(outDir, '_headers')).toMatch(/\/\*\n {2}X-Robots-Tag: noindex, nofollow/);
		expect(await exists(outDir, 'sitemap-index.xml')).toBe(false);
	});

	test('shows the draft the preview carries, and no analytics beacon', async ({ page }) => {
		await open(page, `${site.url}/novedades/`);
		await expect(page.getByText('Borrador sin publicar').first()).toBeVisible();
		expect(await readBuilt(outDir, 'index.html')).not.toContain('cloudflareinsights');
	});

	test('keeps the token out of every file of the build', async () => {
		for (const file of ['index.html', 'novedades/index.html', 'en/index.html', 'robots.txt', '_headers']) {
			expect(await readBuilt(outDir, file), file).not.toContain(TOKEN);
		}
	});

	test('has no serious or critical axe violations with the banner', async ({ browser }) => {
		const context = await browser.newContext({ reducedMotion: 'reduce' });
		const page = await context.newPage();
		await open(page, `${site.url}/`);
		await expect(page.locator('[data-preview-banner]')).toBeVisible();
		expect(await blockingViolations(page)).toEqual([]);
		await context.close();
	});

	test('a normal build ignores the token: no banner, indexable, the sitemap and the beacon stay, the preview is never asked', async ({
		page,
	}) => {
		expect(normalAdmin.previewTokens).toEqual([]);
		expect(normalAdmin.contentRequests).toBeGreaterThan(0);
		await open(page, `${normalSite.url}/`);
		await expect(page.locator('[data-preview-banner]')).toHaveCount(0);
		await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
		await open(page, `${normalSite.url}/novedades/`);
		await expect(page.getByText('Borrador sin publicar')).toHaveCount(0);
		expect(await readBuilt(normalOutDir, 'robots.txt')).toContain('Allow: /');
		expect(await readBuilt(normalOutDir, '_headers')).not.toContain('X-Robots-Tag');
		expect(await exists(normalOutDir, 'sitemap-index.xml')).toBe(true);
		expect(await readBuilt(normalOutDir, 'index.html')).toContain('cloudflareinsights');
	});
});

test.describe('preview build that must stop', () => {
	test.beforeEach(() => test.setTimeout(180_000));
	const stops = async (
		name: string,
		documents: Parameters<typeof startMockAdmin>[0],
		env: (url: string) => Record<string, string>,
	) => {
		const admin = await startMockAdmin(documents);
		try {
			const built = await buildSite(name, { PREVIEW_BUILD: '1', ...env(admin.url) });
			return { built, admin };
		} finally {
			await admin.close();
		}
	};
	const withToken = (token: string) => (url: string) => ({
		PREVIEW_TOKEN: token,
		ADMIN_PREVIEW_URL: `${url}/api/public/preview`,
	});

	test('fails the build on a 401 and says why, without printing the token', async () => {
		const { built, admin } = await stops(
			'preview-401',
			{ content: socialProof(), preview: previewDocument() },
			withToken('wrong-token'),
		);
		expect(built.exitCode).not.toBe(0);
		expect(built.output).toMatch(/HTTP 401/);
		expect(built.output).toMatch(/invalid or expired/);
		expect(built.output).not.toContain('wrong-token');
		expect(admin.previewTokens).toEqual(['wrong-token']);
	});

	test('fails the build when the response is not marked preview: true', async () => {
		const { preview: _preview, ...unmarked } = previewDocument();
		const { built } = await stops('preview-unmarked', { content: socialProof(), preview: unmarked }, withToken(TOKEN));
		expect(built.exitCode).not.toBe(0);
		expect(built.output).toMatch(/preview: true/);
		expect(built.output).not.toContain(TOKEN);
	});

	test('fails the build when PREVIEW_TOKEN is missing, instead of building normal content', async () => {
		const { built, admin } = await stops('preview-no-token', { content: socialProof() }, (url) => ({
			ADMIN_PREVIEW_URL: `${url}/api/public/preview`,
			ADMIN_CONTENT_URL: `${url}/api/public/content`,
		}));
		expect(built.exitCode).not.toBe(0);
		expect(built.output).toMatch(/PREVIEW_TOKEN is not set/);
		expect(admin.contentRequests).toBe(0);
	});
});
