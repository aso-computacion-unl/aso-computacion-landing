import { expect, test } from '@playwright/test';

// The motion libraries are separate chunks; on a slow connection they arrive late. The hero must not stay invisible
// meanwhile (src/layouts/Layout.astro gives up after three seconds), and a late start must not hide it again, while the
// moments below the hero (scroll triggers, the footer badge) still start.
test.describe('hero reveal fallback', () => {
	test('shows the headline after three seconds without motion; motion arriving late keeps it and starts the rest', async ({
		page,
	}) => {
		await page.route(/\/_astro\/(gsap|ScrollTrigger|lenis)\./, async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 4500));
			await route.continue();
		});
		const html = page.locator('html');
		const lines = page.locator('.hero .hero-line');
		const lede = page.locator('.hero .hero-lede');
		await page.goto('/');
		await expect(html).toHaveClass(/\bmotion\b/);
		await expect(lines.first()).toBeHidden();

		// Before the fallback it is hidden, afterwards it is not: the fallback's own timing is pinned by the unit test.
		await expect(html).not.toHaveClass(/\bmotion\b/, { timeout: 4000 });
		await expect(lines).toHaveCount(3);
		for (const line of await lines.all()) await expect(line).toBeVisible();
		await expect(lede).toHaveCSS('opacity', '1');

		// The libraries land at about 4.5 s: nothing may split, hide or restart the headline...
		await expect(html).toHaveAttribute('data-motion-ready', 'true', { timeout: 8000 });
		await page.waitForTimeout(1500);
		await expect(html).not.toHaveClass(/\bmotion\b/);
		await expect(page.locator('.hero .split-char')).toHaveCount(0);
		for (const line of await lines.all()) await expect(line).toBeVisible();
		await expect(lede).toHaveCSS('opacity', '1');

		// ...but the rest of the choreography did start: scroll triggers exist and the footer badge sits at its start pose.
		expect(Number(await html.getAttribute('data-scroll-triggers'))).toBeGreaterThan(0);
		await expect(page.locator('[data-foot-logo]')).not.toHaveCSS('transform', 'none');
	});
});
