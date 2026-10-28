import { expect, test, type Page } from '@playwright/test';

// The home is task first (sign up, news, activities, forum, then who we are), says its sizes once (one type scale, one
// size for every section title), never breaks a word across lines, and folds the old activities behind a disclosure.
// The sections that hide when empty (Inscripciones, Novedades, Directiva, Redes) are checked only when they render.

const ORDER = [
	'inscripciones',
	'novedades',
	'actividades',
	'foro',
	'nosotros',
	'directiva',
	'ideas',
	'faq',
	'redes',
	'aliados',
];

const sectionIds = (page: Page) => page.evaluate((ids) => ids.filter((id) => document.getElementById(id)), ORDER);

test.describe('section order', () => {
	test('follows the task-first order, and the nav links follow the page', async ({ page }) => {
		await page.goto('/');
		const ids = await page.evaluate(() =>
			[...document.querySelectorAll('main > section[id]')].map((section) => section.id),
		);
		expect(ids).toEqual(['top', ...(await sectionIds(page))]);

		const hrefs = await page
			.locator('header nav ul a')
			.evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
		const anchors = hrefs.filter((href) => href.startsWith('#')).map((href) => href.slice(1));
		const positions = anchors.map((anchor) => ids.indexOf(anchor));
		expect(positions.every((position) => position > 0)).toBe(true);
		expect(positions).toEqual([...positions].sort((a, b) => a - b));
		// Novedades points to its own page: it sits between the sign-ups and the activities, where the section is.
		if (hrefs.includes('/novedades')) {
			expect(hrefs.indexOf('/novedades')).toBeGreaterThan(hrefs.indexOf('#inscripciones'));
			expect(hrefs.indexOf('/novedades')).toBeLessThan(hrefs.indexOf('#actividades'));
		}
	});

	test('the hero shortcuts point to sections that render, in the page order', async ({ page }) => {
		await page.goto('/');
		const links = page.getByRole('navigation', { name: 'Atajos' }).getByRole('link');
		const hrefs = await links.evaluateAll((items) => items.map((item) => item.getAttribute('href') ?? ''));
		expect(hrefs).toContain('#foro');
		for (const href of hrefs) await expect(page.locator(href)).toHaveCount(1);
		const ids = await page.evaluate(() =>
			[...document.querySelectorAll('main > section[id]')].map((section) => section.id),
		);
		const positions = hrefs.map((href) => ids.indexOf(href.slice(1)));
		expect(positions).toEqual([...positions].sort((a, b) => a - b));
	});

	test('the English page has the same shortcuts', async ({ page }) => {
		await page.goto('/en/');
		await expect(
			page.getByRole('navigation', { name: 'Shortcuts' }).getByRole('link', { name: /Forum/ }),
		).toHaveAttribute('href', '#foro');
	});
});

for (const width of [390, 768, 1440]) {
	test.describe(`at ${width}px`, () => {
		test.use({ viewport: { width, height: 900 } });

		test('every section title has the same size and the page uses at most nine text sizes', async ({ page }) => {
			await page.goto('/');
			await page.evaluate(() => document.fonts.ready);
			const result = await page.evaluate(() => {
				const sizes = new Set<string>();
				document.querySelectorAll('main *').forEach((element) => {
					const hasText = [...element.childNodes].some((node) => node.nodeType === 3 && node.textContent?.trim());
					if (hasText) sizes.add(getComputedStyle(element).fontSize);
				});
				const titles = [...document.querySelectorAll('main section[id] h2')].map((h2) => getComputedStyle(h2).fontSize);
				return { sizes: [...sizes], titles };
			});
			expect(new Set(result.titles).size).toBe(1);
			expect(result.titles.length).toBeGreaterThan(4);
			expect(result.sizes.length, result.sizes.join(', ')).toBeLessThanOrEqual(9);
		});

		test('has no horizontal overflow and no word split across lines', async ({ page }) => {
			await page.goto('/');
			await page.evaluate(() => document.fonts.ready);
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
			).toBe(0);
			const split = await page.evaluate(() => {
				const found: string[] = [];
				const walk = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT);
				for (let node = walk.nextNode(); node; node = walk.nextNode()) {
					const parent = node.parentElement;
					if (!parent?.offsetParent) continue;
					for (const match of (node.textContent ?? '').matchAll(/\S{4,}/g)) {
						const range = document.createRange();
						range.setStart(node, match.index ?? 0);
						range.setEnd(node, (match.index ?? 0) + match[0].length);
						const rects = [...range.getClientRects()].filter((rect) => rect.width > 0);
						if (rects.length > 1 && Math.abs(rects[0].top - rects[1].top) > 2) found.push(match[0]);
					}
				}
				return found;
			});
			expect(split).toEqual([]);
		});
	});
}

test.describe('activities history', () => {
	test('folds the older entries and always shows the root commit', async ({ page }) => {
		await page.goto('/');
		const fold = page.locator('[data-history-more]');
		test.skip((await fold.count()) === 0, 'the build has too few past entries to fold');
		await expect(fold).not.toHaveAttribute('open', '');
		// The node pops in when it scrolls into view, so bring it there first.
		await page.locator('[data-root-node]').scrollIntoViewIfNeeded();
		await expect(page.locator('[data-root-node]')).toBeVisible();
		const older = fold.locator('[data-card]').first();
		await expect(older).toBeHidden();

		const summary = fold.locator('summary');
		await expect(summary).toHaveText(/^Ver historial \(\d+ más\)$/, { useInnerText: true });
		await summary.focus();
		await page.keyboard.press('Enter');
		await expect(fold).toHaveAttribute('open', '');
		await expect(summary).toHaveText('Ocultar historial', { useInnerText: true });
		await older.scrollIntoViewIfNeeded();
		await expect(older).toBeVisible();
		await page.keyboard.press('Space');
		await expect(fold).not.toHaveAttribute('open', '');
		await expect(older).toBeHidden();
	});

	test('a filter that matches a folded entry opens the fold', async ({ page }) => {
		await page.goto('/');
		const fold = page.locator('[data-history-more]');
		test.skip((await fold.count()) === 0, 'the build has too few past entries to fold');
		const type = await fold.locator('[data-type]').first().getAttribute('data-type');
		test.skip(!type, 'the folded entries have no type to filter by');
		await page.locator(`[data-filter="${type}"]`).click();
		await expect(fold).toHaveAttribute('open', '');
	});

	test.describe('without JS', () => {
		test.use({ javaScriptEnabled: false });

		test('the summary opens the fold by itself', async ({ page }) => {
			await page.goto('/');
			const fold = page.locator('[data-history-more]');
			test.skip((await fold.count()) === 0, 'the build has too few past entries to fold');
			const older = fold.locator('[data-card]').first();
			await expect(older).toBeHidden();
			await fold.locator('summary').click();
			await expect(older).toBeVisible();
		});
	});

	test('the English page names the control in English', async ({ page }) => {
		await page.goto('/en/');
		const fold = page.locator('[data-history-more]');
		test.skip((await fold.count()) === 0, 'the build has too few past entries to fold');
		await expect(fold.locator('summary')).toHaveText(/^Show history \(\d+ more\)$/, { useInnerText: true });
	});
});
