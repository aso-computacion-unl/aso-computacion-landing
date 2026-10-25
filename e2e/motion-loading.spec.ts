import { devices, expect, test, type Page } from '@playwright/test';

// The home page's motion libraries are separate chunks; which of them a visitor downloads depends on the device.
const motionChunks = (page: Page) => {
	const loaded = new Set<string>();
	page.on('request', (request) => {
		const chunk = new URL(request.url()).pathname.match(/\/_astro\/(gsap|ScrollTrigger|lenis)\./);
		if (chunk) loaded.add(chunk[1]);
	});
	return loaded;
};

test.describe('motion loading', () => {
	test('a desktop with a mouse gets GSAP, ScrollTrigger and Lenis', async ({ page }) => {
		const loaded = motionChunks(page);
		await page.goto('/');
		await expect(page.locator('html')).toHaveAttribute('data-motion-ready', 'true');
		expect([...loaded].sort()).toEqual(['ScrollTrigger', 'gsap', 'lenis']);
	});

	test.describe('touch screen', () => {
		// defaultBrowserType would force a new worker; the touch emulation is all this suite needs.
		const { defaultBrowserType: _, ...phone } = devices['Pixel 7'];
		test.use(phone);

		test('keeps the animations but skips the smooth scroll', async ({ page }) => {
			const loaded = motionChunks(page);
			await page.goto('/');
			await expect(page.locator('html')).toHaveAttribute('data-motion-ready', 'true');
			expect([...loaded].sort()).toEqual(['ScrollTrigger', 'gsap']);
		});
	});

	test.describe('reduced motion', () => {
		test.use({ reducedMotion: 'reduce' });

		test('loads no motion library and leaves the page static', async ({ page }) => {
			const loaded = motionChunks(page);
			await page.goto('/', { waitUntil: 'networkidle' });
			await page.waitForTimeout(1500);
			expect([...loaded]).toEqual([]);
			await expect(page.locator('html')).not.toHaveClass(/\bmotion\b/);
			await expect(page.locator('html')).not.toHaveAttribute('data-motion-ready', 'true');
		});
	});
});
