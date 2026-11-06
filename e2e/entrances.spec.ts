import { expect, test, type Page } from '@playwright/test';

// The tickets, the news list and the forum window wait for their entrance behind `html.motion` (global.css) and are dealt in
// by editorial-motion.ts as they scroll into view. Both halves are checked: the waiting state is real (it is what the
// entrance starts from) and every piece does arrive; without motion nothing waits.
const pieces = ['.tk-item', '.news-list > li', '.forum-app'];

const opacities = (page: Page, selector: string) =>
	page.locator(selector).evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).opacity));

test.describe('editorial entrances', () => {
	test('wait out of sight while motion is pending', async ({ page }) => {
		// Hold the motion chunks back so the page stays in its pre-motion state for the check.
		await page.route(/\/_astro\/(gsap|ScrollTrigger|lenis)\./, async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 2500));
			await route.continue().catch(() => {});
		});
		await page.goto('/');
		await expect(page.locator('html')).toHaveClass(/\bmotion\b/);
		for (const selector of pieces) {
			if ((await page.locator(selector).count()) === 0) continue; // The news list is absent on a build without news.
			expect(new Set(await opacities(page, selector)), selector).toEqual(new Set(['0']));
		}
	});

	test('arrive when they scroll into view', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		await expect(page.locator('html')).toHaveAttribute('data-motion-ready', 'true');
		for (const selector of pieces) {
			const first = page.locator(selector).first();
			if ((await page.locator(selector).count()) === 0) continue;
			await first.scrollIntoViewIfNeeded();
			await expect(first, selector).toHaveCSS('opacity', '1', { timeout: 6000 });
		}
	});

	test('are simply there under reduced motion', async ({ browser }) => {
		const context = await browser.newContext({ reducedMotion: 'reduce' });
		const page = await context.newPage();
		await page.goto('/');
		await expect(page.locator('html')).not.toHaveClass(/\bmotion\b/);
		for (const selector of pieces) {
			if ((await page.locator(selector).count()) === 0) continue;
			expect(new Set(await opacities(page, selector)), selector).toEqual(new Set(['1']));
		}
		await context.close();
	});
});
