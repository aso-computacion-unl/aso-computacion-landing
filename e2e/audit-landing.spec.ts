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

for (const theme of ['dark', 'light'] as const) {
	test(`a phone-sized home has no serious or critical axe violations (${theme} theme, 320px)`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 320, height: 700 }, reducedMotion: 'reduce' });
		const page = await context.newPage();
		await page.addInitScript((value) => localStorage.setItem('aso-theme', value), theme);
		await page.goto('/', { waitUntil: 'networkidle' });
		const { violations } = await new AxeBuilder({ page }).analyze();
		await context.close();
		expect(
			violations
				.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))
				.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`),
		).toEqual([]);
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
				const ring =
					(style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) ||
					(style.boxShadow !== 'none' && style.boxShadow !== '');
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

test.describe('FAQ accordion', () => {
	const item = (page: Page, index: number) => page.locator('#faq .faq-item').nth(index);

	test('is a plain accordion: one question per summary, no terminal, cards, badges or labels', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		const faq = page.locator('#faq');
		expect(await faq.locator('details.faq-item').count()).toBeGreaterThan(1);
		await expect(faq.locator('details.faq-item summary .faq-title').first()).not.toBeEmpty();
		await expect(faq.locator('[data-faq], [data-faq-term], .faq-card, .faq-prompt, .faq-man, .faq-mark')).toHaveCount(
			0,
		);
		await expect(faq.getByText(/git help/)).toHaveCount(0);
		await expect(faq.locator('header .lead')).toHaveText('Lo que más nos preguntan.');
	});

	test('opens and closes by click, one at a time', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		await item(page, 0).scrollIntoViewIfNeeded();
		await expect(item(page, 0)).not.toHaveAttribute('open', '');
		await item(page, 0).locator('summary').click();
		await expect(item(page, 0)).toHaveAttribute('open', '');
		await expect(item(page, 0).locator('.faq-a')).toBeVisible();
		await item(page, 1).locator('summary').click();
		await expect(item(page, 1)).toHaveAttribute('open', '');
		await expect(item(page, 0)).not.toHaveAttribute('open', '');
		await item(page, 1).locator('summary').click();
		await expect(item(page, 1)).not.toHaveAttribute('open', '');
	});

	test('opens and closes from the keyboard alone', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		const summary = item(page, 0).locator('summary');
		await summary.scrollIntoViewIfNeeded();
		await summary.focus();
		await page.keyboard.press('Enter');
		await expect(item(page, 0)).toHaveAttribute('open', '');
		await page.keyboard.press('Space');
		await expect(item(page, 0)).not.toHaveAttribute('open', '');
		await page.keyboard.press('Space');
		await expect(item(page, 0)).toHaveAttribute('open', '');
	});

	test('keeps the plus/minus mark on the title row, at the edge of the box', async ({ page }) => {
		for (const width of [1440, 390]) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto('/', { waitUntil: 'networkidle' });
			const summary = item(page, 0).locator('summary');
			await summary.scrollIntoViewIfNeeded();
			const [box, title, plus] = await Promise.all([
				summary.boundingBox(),
				summary.locator('.faq-title').boundingBox(),
				summary.locator('.faq-plus').boundingBox(),
			]);
			expect(box && title && plus, `${width}px`).toBeTruthy();
			// Same row (the mark is centred on the title block) and pinned to the right edge of the summary.
			expect(Math.abs(plus!.y + plus!.height / 2 - (title!.y + title!.height / 2)), `${width}px`).toBeLessThan(2);
			expect(box!.x + box!.width - (plus!.x + plus!.width), `${width}px`).toBeLessThan(32);
			expect(title!.x - box!.x, `${width}px`).toBeLessThan(32);
		}
	});

	test('sends the missing question to the forum from a 44px link after the list', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		const faq = page.locator('#faq');
		const link = faq.locator('.faq-after a');
		await expect(link).toHaveAttribute('href', '#foro');
		await expect(faq.locator('.faq-list ~ .faq-after')).toHaveCount(1);
		await expect(faq.locator('header').getByRole('link')).toHaveCount(0);
		await link.scrollIntoViewIfNeeded();
		expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
		await link.click();
		await expect(page).toHaveURL(/#foro$/);
	});
});

test.describe('language and the forum', () => {
	test('the language switch goes to the other home and back', async ({ page }) => {
		await page.goto('/');
		await page.locator('header a[hreflang="en"]').first().click();
		await expect(page).toHaveURL(/\/en\/$/);
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');
		await page.locator('header a[hreflang="es"]').first().click();
		await expect(page).toHaveURL(/\/$/);
		await expect(page.locator('html')).toHaveAttribute('lang', 'es');
	});

	test('the forum section links only to the admin forum, with a name that says where it goes', async ({ page }) => {
		await page.goto('/');
		const hrefs = await page
			.locator('#foro a[href^="http"]')
			.evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
		// With no admin origin (the committed fallback build) the section keeps its teaser and has no way in: nothing broken.
		for (const href of hrefs) expect(new URL(href).pathname).toMatch(/^\/foro/);
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
		// The committed fallback has no tickets: links here mean the admin's content, not the fallback, is on the page.
		expect(links.length).toBeGreaterThan(0);
		for (const href of links) expect(new URL(href).pathname).toMatch(/^\/foro\/eventos\//);
		await expect(page.locator('#inscripciones')).toHaveAttribute('data-seats-settled', '');
		for (const width of WIDTHS) {
			await page.setViewportSize({ width, height: 800 });
			expect(await overflow(page), `${width}px`).toBe(0);
		}
		expect(problems).toEqual([]);
	});
});
