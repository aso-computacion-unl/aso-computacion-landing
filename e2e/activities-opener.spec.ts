import { expect, test, type Page } from '@playwright/test';

// The page opens short: the headline, three ticket-shaped shortcuts and the ribbon. The scroll animation that used to
// open it (the isotype, its stem) opens Actividades instead, and the trunk it lands on splits into two sides.

const geometry = (page: Page) =>
	page.evaluate(() => {
		const rect = (selector: string) => {
			const box = document.querySelector(selector)?.getBoundingClientRect();
			return box && { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width };
		};
		return {
			plan: rect('.sp-plan .graph'),
			history: rect('.sp-col:not(.sp-plan) .graph'),
			trunk: rect('[data-trunk]'),
			hero: rect('#top'),
			ribbon: rect('.ribbon'),
		};
	});

test.describe('the hero', () => {
	test('has the headline, a lede and the shortcuts, and no mark, stem or pin', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Computación');
		await expect(page.locator('#top .hero-lede')).not.toBeEmpty();
		await expect(page.getByRole('navigation', { name: 'Atajos' }).getByRole('link')).not.toHaveCount(0);
		await expect(page.locator('#top [data-opener-mark], #top svg.hero-mark-svg, #top [data-hero-stem]')).toHaveCount(0);
	});

	test.describe('on a phone', () => {
		test.use({ viewport: { width: 390, height: 844 } });

		test('is about one screen: the shortcuts and the ribbon are in the first viewport', async ({ page }) => {
			await page.goto('/');
			await page.evaluate(() => document.fonts.ready);
			const { hero, ribbon } = await geometry(page);
			expect(hero?.bottom).toBeLessThanOrEqual(844);
			expect(ribbon?.top).toBeLessThan(844);
			for (const link of await page.getByRole('navigation', { name: 'Atajos' }).getByRole('link').all()) {
				const box = await link.boundingBox();
				expect(box?.height).toBeGreaterThanOrEqual(44);
				expect(box?.y).toBeLessThan(844);
			}
		});
	});
});

test.describe('the Actividades opener', () => {
	test('every control of the section is a 44 px target', async ({ page }) => {
		await page.goto('/');
		const small = await page
			.locator('#actividades')
			.locator('button:visible, summary:visible, a:visible')
			.evaluateAll((nodes) =>
				nodes
					.map((node) => ({ node: node.className || node.tagName, height: node.getBoundingClientRect().height }))
					.filter((control) => control.height < 44),
			);
		// Links inside a card's text are inline, so only the controls the section draws count.
		expect(small.filter((control) => /chip|history-toggle|reg-/.test(String(control.node)))).toEqual([]);
	});

	test.describe('on a wide screen', () => {
		test.use({ viewport: { width: 1440, height: 900 } });

		test('plays over a sticky stage, then the trunk splits: planned on the left, history on the right', async ({
			page,
		}) => {
			await page.goto('/');
			await page.waitForFunction(() => document.documentElement.dataset.motionReady === 'true');
			const stage = page.locator('[data-opener-stage]');
			await expect(stage).toHaveCSS('position', 'sticky');
			// Scroll to the end of the run: the stem has landed, the isotype sits on top of it and the cue has arrived.
			await page.evaluate(() => {
				const run = document.querySelector<HTMLElement>('[data-opener]')!;
				window.scrollTo(0, run.getBoundingClientRect().top + scrollY + run.offsetHeight - innerHeight);
			});
			await expect
				.poll(() => page.locator('[data-opener-cue]').evaluate((node) => getComputedStyle(node).opacity))
				.toBe('1');
			await expect
				.poll(() => page.locator('[data-opener-emblem]').evaluate((node) => getComputedStyle(node).opacity))
				.toBe('1');
			await expect
				.poll(() => page.locator('[data-trunk]').evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).d))
				.toBeCloseTo(1, 1);
			const { plan, history, trunk } = await geometry(page);
			const center = (trunk!.left + trunk!.right) / 2;
			expect(plan!.right).toBeLessThan(center);
			expect(history!.left).toBeGreaterThan(center);
			expect(Math.abs(center - 720)).toBeLessThan(2);
		});

		test('with reduced motion it is the static end state: no sticky stage, the stem and the cue in the page', async ({
			browser,
		}) => {
			const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
			const page = await context.newPage();
			await page.goto('/');
			await expect(page.locator('[data-opener-stage]')).toHaveCSS('position', 'relative');
			await expect(page.locator('[data-opener-mark]')).toBeHidden();
			for (const hook of ['stem', 'emblem', 'cue']) await expect(page.locator(`[data-opener-${hook}]`)).toBeVisible();
			await expect(page.locator('[data-opener-cue]')).toHaveCSS('opacity', '1');
			await expect(page.locator('[data-trunk]')).toBeVisible();
			await context.close();
		});
	});

	test.describe('on a phone', () => {
		test.use({ viewport: { width: 390, height: 844 } });

		test('the two sides stack, with the trunk at the edge of the rails', async ({ page }) => {
			await page.goto('/');
			const { plan, history, trunk } = await geometry(page);
			expect(plan!.bottom).toBeLessThanOrEqual(history!.top);
			expect(plan!.left).toBeCloseTo(history!.left, 0);
			// The trunk is where the rails are: inside the first stretch of the column.
			expect(trunk!.left).toBeGreaterThan(plan!.left);
			expect(trunk!.left).toBeLessThan(plan!.left + 40);
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
			).toBe(0);
		});
	});
});
