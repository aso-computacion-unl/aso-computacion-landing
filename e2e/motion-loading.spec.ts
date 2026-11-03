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

	test.describe('off screen', () => {
		const ribbonShift = (page: Page) =>
			page.evaluate(async () => {
				const track = document.querySelector('.ribbon-track');
				const before = track ? getComputedStyle(track).transform : '';
				await new Promise((resolve) => setTimeout(resolve, 600));
				return track ? getComputedStyle(track).transform !== before : false;
			});

		test('the ribbon drifts while it shows and stops when it does not', async ({ page }) => {
			await page.goto('/');
			await expect(page.locator('html')).toHaveAttribute('data-motion-ready', 'true');
			expect(await ribbonShift(page)).toBe(true);
			await page.locator('#foro').scrollIntoViewIfNeeded();
			await page.waitForTimeout(800);
			expect(await ribbonShift(page)).toBe(false);
		});

		test('no looping animation runs where nobody can see it', async ({ page }) => {
			await page.goto('/');
			await expect(page.locator('html')).toHaveAttribute('data-motion-ready', 'true');
			for (const place of ['#top', '#actividades', '#foro', '#faq']) {
				await page.locator(place).scrollIntoViewIfNeeded();
				await page.waitForTimeout(700);
				const hidden = await page.evaluate(() =>
					document
						.getAnimations()
						.filter((animation) => animation.playState === 'running')
						.flatMap((animation) => {
							const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
							// A cursor under the fold of a block that is half on screen still belongs to what is showing.
							const shown = target?.closest('[data-lang], .forum-live, .tk-list') ?? target;
							const box = shown?.getBoundingClientRect();
							const away = box && (box.bottom < 0 || box.top > window.innerHeight);
							return away ? [`${animation.constructor.name} ${target?.className}`] : [];
						}),
				);
				expect(hidden, place).toEqual([]);
			}
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
