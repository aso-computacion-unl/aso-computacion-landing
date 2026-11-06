import { expect, test } from '@playwright/test';

// From the two-column hero up, the headline lines never wrap (`white-space: nowrap`), so a line that is wider than the
// column would run under the round logo. Check the widest line against the logo at the sizes where the columns exist.
for (const path of ['/', '/en/']) {
	for (const width of [1024, 1100, 1280, 1440, 1920]) {
		test(`${path} headline stays clear of the hero logo at ${width}px`, async ({ browser }) => {
			const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width, height: 900 } });
			const page = await context.newPage();
			await page.goto(path);
			const box = await page.evaluate(() => {
				const logo = document.querySelector('[data-hero-logo]')!.getBoundingClientRect();
				const lines = [...document.querySelectorAll('.hero-line')].map((line) => {
					const range = document.createRange();
					range.selectNodeContents(line);
					return range.getBoundingClientRect().right;
				});
				return { widest: Math.max(...lines), logo: logo.left, page: document.documentElement.scrollWidth };
			});
			expect(box.widest).toBeLessThanOrEqual(box.logo + 1);
			expect(box.page).toBeLessThanOrEqual(width);
			await context.close();
		});
	}
}
