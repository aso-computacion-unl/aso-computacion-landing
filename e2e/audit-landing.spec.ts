import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Platform audit of the landing (the Taquilla home and its pages), on the build served by `astro preview`: the cases the
// feature specs do not cover together. Responsive at the four widths, keyboard and focus, reduced motion, the 404, the
// console, and the links that leave the page. The hostile-content cases (very long titles, empty lists, broken images,
// seats failing) build their own site in audit-landing-content.spec.ts.

const WIDTHS = [320, 390, 768, 1440];
const PAGES = ['/', '/en/', '/novedades/', '/en/novedades/'];

// Console errors, page errors and failed requests of one visit. Third-party hosts are blocked in the specs, so a
// failure on them is not the landing's.
function watch(page: Page) {
	const problems: string[] = [];
	page.on('console', (message) => {
		if (message.type() === 'error') problems.push(`console: ${message.text()}`);
	});
	page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
	page.on('requestfailed', (request) => {
		const { hostname } = new URL(request.url());
		if (hostname === '127.0.0.1' || hostname === 'localhost') problems.push(`failed: ${request.url()}`);
	});
	return problems;
}

const overflow = (page: Page) =>
	page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const width of WIDTHS) {
	test.describe(`at ${width}px`, () => {
		test.use({ viewport: { width, height: 800 } });

		for (const path of PAGES) {
			test(`${path} has no horizontal overflow`, async ({ page }) => {
				await page.goto(path, { waitUntil: 'networkidle' });
				await page.evaluate(() => document.fonts.ready);
				expect(await overflow(page)).toBe(0);
			});
		}
	});
}

test.describe('404', () => {
	test('answers 404 with a page that says where to go, in both languages, and nothing overflows at 320px', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 320, height: 700 });
		const response = await page.goto('/no-such-page/');
		expect(response?.status()).toBe(404);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await expect(page.getByRole('link', { name: /Volver|inicio/i }).first()).toHaveAttribute('href', '/');
		await expect(page.locator('a[href="/en/"]').first()).toBeVisible();
		expect(await overflow(page)).toBe(0);
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
	});

	for (const theme of ['dark', 'light'] as const) {
		test(`has no serious or critical axe violations (${theme} theme)`, async ({ page }) => {
			await page.addInitScript((value) => localStorage.setItem('aso-theme', value), theme);
			await page.goto('/no-such-page/', { waitUntil: 'networkidle' });
			const { violations } = await new AxeBuilder({ page }).analyze();
			expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')).map((v) => v.id)).toEqual([]);
		});
	}
});

test.describe('console', () => {
	for (const path of PAGES) {
		test(`${path} logs no errors and fails no request`, async ({ page }) => {
			const problems = watch(page);
			await page.goto(path, { waitUntil: 'networkidle' });
			await page.mouse.wheel(0, 4000);
			await page.waitForTimeout(400);
			expect(problems).toEqual([]);
		});
	}
});

test.describe('keyboard', () => {
	test('the first Tab stop is a skip link to the content, and Enter moves focus there', async ({ page }) => {
		await page.goto('/');
		await page.keyboard.press('Tab');
		const skip = page.locator(':focus');
		await expect(skip).toHaveAttribute('href', '#contenido');
		await expect(skip).toBeVisible();
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/#contenido$/);
		await expect(page.locator('#contenido')).toBeVisible();
	});

	test('every Tab stop of the home shows a focus indicator and nothing traps the keyboard', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		const stops: string[] = [];
		const bad: string[] = [];
		for (let i = 0; i < 160; i += 1) {
			await page.keyboard.press('Tab');
			const info = await page.evaluate(() => {
				const el = document.activeElement as HTMLElement | null;
				if (!el || el === document.body) return { end: true } as const;
				const style = getComputedStyle(el);
				const rect = el.getBoundingClientRect();
				// The FAQ prompt draws its ring on the frame around the input (checked on its own below).
				const ring =
					(style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) ||
					(style.boxShadow !== 'none' && style.boxShadow !== '') ||
					el.matches('[data-faq-input]');
				return {
					end: false,
					label: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''} ${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}`,
					ring,
					visible: rect.width > 0 && rect.height > 0,
				} as const;
			});
			if (info.end) break;
			stops.push(info.label);
			if (!info.visible) bad.push(`invisible: ${info.label}`);
			if (!info.ring) bad.push(`no ring: ${info.label}`);
		}
		expect(bad).toEqual([]);
		expect(stops.length).toBeGreaterThan(20);
		expect(stops.length).toBeLessThan(160);
	});

	for (const theme of ['dark', 'light'] as const) {
		test(`the FAQ prompt shows focus on its frame, at 3:1 against its unfocused border (${theme} theme)`, async ({
			page,
		}) => {
			await page.addInitScript((value) => localStorage.setItem('aso-theme', value), theme);
			await page.goto('/', { waitUntil: 'networkidle' });
			const frame = page.locator('.faq-prompt');
			await frame.scrollIntoViewIfNeeded();
			const border = () =>
				frame.evaluate((element) => {
					const context = document.createElement('canvas').getContext('2d')!;
					const rgb = (color: string, under: [number, number, number]) => {
						context.clearRect(0, 0, 1, 1);
						context.fillStyle = color;
						context.fillRect(0, 0, 1, 1);
						const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
						return [r, g, b].map((value, i) => (value * a + under[i] * (255 - a)) / 255) as [number, number, number];
					};
					const style = getComputedStyle(element);
					const luminance = (c: number[]) =>
						c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as number[];
					const well = rgb(style.backgroundColor, [255, 255, 255]);
					const line = rgb(style.borderTopColor, well);
					const [wr, wg, wb] = luminance(well);
					const [lr, lg, lb] = luminance(line);
					const lw = 0.2126 * wr + 0.7152 * wg + 0.0722 * wb;
					const ll = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
					return { line, ratio: (Math.max(lw, ll) + 0.05) / (Math.min(lw, ll) + 0.05) };
				});
			const resting = await border();
			await page.locator('[data-faq-input]').focus();
			const focused = await border();
			expect(focused.line).not.toEqual(resting.line);
			expect(focused.ratio).toBeGreaterThanOrEqual(3);
		});
	}

	test('the theme switch works from the keyboard and is remembered', async ({ page }) => {
		await page.goto('/');
		const before = await page.locator('html').getAttribute('data-theme');
		const toggle = page.locator('[data-theme-toggle]').first();
		await toggle.focus();
		await page.keyboard.press('Enter');
		const after = await page.locator('html').getAttribute('data-theme');
		expect(after).not.toBe(before);
		await page.reload();
		await expect(page.locator('html')).toHaveAttribute('data-theme', after ?? '');
	});
});

test.describe('links', () => {
	test('every in-page anchor of the home points to an element that exists', async ({ page }) => {
		await page.goto('/');
		const missing = await page.evaluate(() =>
			[...document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')]
				.map((a) => a.getAttribute('href') ?? '')
				.filter((href) => href.length > 1 && !document.getElementById(decodeURIComponent(href.slice(1)))),
		);
		expect(missing).toEqual([]);
	});

	test('every link that opens a new tab has rel noopener, and every link has a name', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		const result = await page.evaluate(() => {
			const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')];
			return {
				unsafe: links.filter((a) => a.target === '_blank' && !/noopener/.test(a.rel)).map((a) => a.href),
				nameless: links
					.filter((a) => !(a.getAttribute('aria-label') || a.textContent?.trim() || a.querySelector('img[alt]')))
					.map((a) => a.href),
			};
		});
		expect(result).toEqual({ unsafe: [], nameless: [] });
	});

	test('every internal link of the home and of the news answers', async ({ page, request }) => {
		const seen = new Set<string>();
		for (const path of ['/', '/en/', '/novedades/']) {
			await page.goto(path);
			const hrefs = await page.evaluate(() =>
				[...document.querySelectorAll<HTMLAnchorElement>('a[href]')]
					.map((a) => new URL(a.href))
					.filter((url) => url.origin === location.origin)
					.map((url) => url.pathname),
			);
			for (const href of hrefs) seen.add(href);
		}
		const broken: string[] = [];
		for (const href of seen) {
			const response = await request.get(href);
			if (response.status() !== 200) broken.push(`${response.status()} ${href}`);
		}
		expect(broken).toEqual([]);
	});
});

test.describe('reduced motion', () => {
	test.use({ reducedMotion: 'reduce' });

	test('nothing loops or moves on the home', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		await page.mouse.wheel(0, 3000);
		await page.waitForTimeout(500);
		const running = await page.evaluate(() =>
			document
				.getAnimations()
				.filter((animation) => animation.playState === 'running')
				.map((animation) => (animation.effect as KeyframeEffect | null)?.target?.className ?? 'unknown'),
		);
		expect(running).toEqual([]);
	});
});

// A running dev server or deploy, when one is given (`AUDIT_LIVE_URL=http://127.0.0.1:4323`): the page a person gets from a
// cold start. Skipped otherwise, so the suite needs no stack besides the preview.
test.describe('a running site', () => {
	const live = process.env.AUDIT_LIVE_URL;
	test.skip(!live, 'AUDIT_LIVE_URL is not set');

	test('renders the home with its sections, seats and links to the admin, and logs no errors', async ({ page }) => {
		const problems = watch(page);
		await page.goto(`${live}/`, { waitUntil: 'networkidle' });
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await expect(page.locator('main > section[id]')).not.toHaveCount(0);
		const links = await page
			.locator('[data-reg-action]')
			.evaluateAll((items) => items.map((item) => item.getAttribute('href') ?? ''));
		console.log(
			JSON.stringify({
				sections: await page.locator('main > section[id]').evaluateAll((n) => n.map((s) => s.id)),
				links,
			}),
		);
		await expect(page.locator('#inscripciones')).toHaveAttribute('data-seats-settled', '');
		expect(problems).toEqual([]);
	});
});
