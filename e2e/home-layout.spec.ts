import { expect, test, type Page } from '@playwright/test';

// The home opens with who we are, then the agenda (sign up, activities, news), then the forum and the board; it says its sizes once (one type scale, one
// size for every section title), never breaks a word across lines, and folds the old activities behind a disclosure.
// The sections that hide when empty (Inscripciones, Novedades, Directiva, Redes) are checked only when they render.

const ORDER = [
	'nosotros',
	'inscripciones',
	'actividades',
	'novedades',
	'foro',
	'directiva',
	'faq',
	'ideas',
	'redes',
	'aliados',
];

const sectionIds = (page: Page) => page.evaluate((ids) => ids.filter((id) => document.getElementById(id)), ORDER);

test.describe('section order', () => {
	test('follows the story-first order, and the nav links follow the page', async ({ page }) => {
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
		// Novedades points to its own page: it sits between the activities and the forum, where the section is.
		if (hrefs.includes('/novedades')) {
			expect(hrefs.indexOf('/novedades')).toBeGreaterThan(hrefs.indexOf('#actividades'));
			expect(hrefs.indexOf('/novedades')).toBeLessThan(hrefs.indexOf('#foro'));
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

test.describe('polish', () => {
	test('Nosotros has one plain kicker and a statement that is neither justified nor scrubbed word by word', async ({
		page,
	}) => {
		await page.goto('/');
		const about = page.locator('#nosotros');
		await expect(about.locator('.eyebrow')).toHaveText('Nosotros');
		await expect(about.locator('.file-tab')).toHaveCount(0);
		await expect(about.locator('[data-statement]')).toHaveCount(0);
		const statement = about.locator('.about-statement');
		await expect(statement).toHaveText(
			'Representamos a quienes estudian Computación en la Universidad Nacional de Loja.',
		);
		await expect(statement).not.toHaveCSS('text-align', 'justify');
		await expect(about.locator('.about-facts')).toHaveText('Organización estudiantil · ASO Computación – UNL');
	});

	test('the English page says the same sentence', async ({ page }) => {
		await page.goto('/en/');
		await expect(page.locator('#nosotros .eyebrow')).toHaveText('About');
		await expect(page.locator('#nosotros .about-statement')).toHaveText(
			'We represent the students of Computer Science at the Universidad Nacional de Loja.',
		);
	});

	test('the board does not list the roles twice, and Redes has no sticker', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('#directiva .role-chip')).toHaveCount(0);
		await expect(page.locator('#redes .social-sticker')).toHaveCount(0);
	});

	test('Ideas lists the four steps by title only', async ({ page }) => {
		await page.goto('/');
		const reasons = page.locator('#ideas [data-reason]');
		await expect(reasons).toHaveCount(4);
		for (const reason of await reasons.all()) await expect(reason.locator('p:not(.reason-num)')).toHaveCount(0);
	});

	test('an upcoming card leaves hora / lugar / para to its ticket, and shortens its description only when it links on', async ({
		page,
	}) => {
		await page.goto('/');
		const cards = page.locator('#actividades .plan .commit:has(.node-upcoming)');
		test.skip((await cards.count()) === 0, 'the build has no upcoming activities');
		await expect(cards.locator('.card-meta')).toHaveCount(0);
		for (const card of await cards.all()) {
			const description = card.locator('.card-main > p.text-mist');
			if ((await description.count()) === 0) continue;
			const { clamp, height, line } = await description.evaluate((node) => {
				const style = getComputedStyle(node);
				return { clamp: style.webkitLineClamp, height: node.clientHeight, line: parseFloat(style.lineHeight) };
			});
			// Without a link to the activity's page the card is the only place the full description can be read.
			if ((await card.locator('[data-card-link]').count()) === 0) {
				expect(clamp).not.toBe('2');
				continue;
			}
			expect(clamp).toBe('2');
			expect(height).toBeLessThanOrEqual(line * 2 + 1);
		}
	});

	test('the ribbon band is filled end to end on a wide screen', async ({ page }) => {
		await page.setViewportSize({ width: 1920, height: 900 });
		await page.goto('/');
		const { band, group } = await page.evaluate(() => ({
			band: document.querySelector('.ribbon-band')!.getBoundingClientRect().width,
			group: document.querySelector('.ribbon-group')!.getBoundingClientRect().width,
		}));
		// The track slides one group to the left, so each group alone must cover the band.
		expect(group).toBeGreaterThanOrEqual(band);
	});

	test('every filter chip has something to filter', async ({ page }) => {
		await page.goto('/');
		const counts = await page
			.locator('#actividades [data-filter]:not([data-filter="all"]) .chip-count')
			.allTextContents();
		expect(counts.filter((count) => count.trim() === '0')).toEqual([]);
	});
});

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

// WCAG 1.4.10 asks for no sideways scrolling at 320 px, and the touch bar of the page is 44 px.
test.describe('small screens', () => {
	test.use({ viewport: { width: 320, height: 640 } });

	for (const path of ['/', '/en/']) {
		test(`${path} does not scroll sideways at 320px`, async ({ page }) => {
			await page.goto(path);
			await page.evaluate(() => document.fonts.ready);
			const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
			expect(overflow).toBeLessThanOrEqual(0);
		});
	}
});

for (const width of [390, 1440]) {
	test.describe(`controls at ${width}px`, () => {
		test.use({ viewport: { width, height: 900 } });

		test('every visible link and button is a 44 px target, except the ones inside a line of text', async ({ page }) => {
			await page.goto('/');
			await page.evaluate(() => document.fonts.ready);
			const small = await page.evaluate(() =>
				[
					...document.querySelectorAll<HTMLElement>(
						'header a, header button, main a, main button, main summary, footer a',
					),
				]
					.filter((node) => {
						const style = getComputedStyle(node);
						const box = node.getBoundingClientRect();
						// The skip link is 1 px until it takes focus; a link that is part of a sentence is inline.
						return box.width > 1 && style.display !== 'inline' && style.visibility !== 'hidden';
					})
					.map((node) => ({
						control: `${node.tagName.toLowerCase()}.${String(node.className).split(' ')[0]} "${(node.textContent ?? '').trim().slice(0, 24)}"`,
						width: Math.round(node.getBoundingClientRect().width),
						height: Math.round(node.getBoundingClientRect().height),
					}))
					.filter((control) => control.width < 44 || control.height < 44),
			);
			expect(small).toEqual([]);
		});
	});
}
