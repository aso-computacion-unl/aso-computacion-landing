import { expect, test } from '@playwright/test';

// The news section of the home is a teaser (the latest posts as plain links and one button to the news page); the forum
// section is a terminal (category tabs over example threads with the way in beside them). The committed fallback has no
// news, so the news section is not on the page of a plain build: its tests skip when there are no rows, and run against
// a build with news (ADMIN_CONTENT_URL pointing at an admin).

test.describe('news teaser', () => {
	test('lists at most three posts, each a link to its post, and one button to the news page', async ({ page }) => {
		await page.goto('/');
		const rows = page.locator('#novedades .news-list a');
		const count = await rows.count();
		test.skip(count === 0, 'needs a build with news (the fallback has none)');

		expect(count).toBeLessThanOrEqual(3);
		for (let i = 0; i < count; i++) {
			await expect(rows.nth(i)).toHaveAttribute('href', /\/novedades\/[^/]+\/?$/);
			await expect(rows.nth(i).locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);
			await expect(rows.nth(i).locator('.news-title')).not.toBeEmpty();
		}
		const head = page.locator('#novedades header.section-head');
		await expect(head.getByRole('link')).toHaveCount(1);
		await expect(head.getByRole('link', { name: /Ver todas las novedades/ })).toHaveAttribute('href', '/novedades');
		// No terminal window any more.
		await expect(page.locator('#novedades .term-win')).toHaveCount(0);
	});

	test.describe('without JS', () => {
		test.use({ javaScriptEnabled: false });

		test('keeps every row and the button as plain links', async ({ page }) => {
			await page.goto('/');
			const rows = await page.locator('#novedades .news-list a').all();
			test.skip(rows.length === 0, 'the build has no news, so the section is not on the page');

			for (const row of rows) await expect(row).toHaveAttribute('href', /\/novedades\//);
			await expect(page.locator('#novedades header.section-head').getByRole('link')).toHaveAttribute(
				'href',
				'/novedades',
			);
		});
	});
});

test.describe('forum terminal', () => {
	test('filters the example threads by category and numbers the steps', async ({ page }) => {
		await page.goto('/');
		const forum = page.locator('#foro');
		const threads = forum.locator('[data-forum-thread]');
		const total = await threads.count();

		await expect(forum.getByText('$ git log --grep=')).toBeVisible();
		const tab = forum.getByRole('tab', { name: /Materias/ });
		await tab.click();
		await expect(tab).toHaveAttribute('aria-selected', 'true');
		const shown = forum.locator('[data-forum-thread]:visible');
		const shownCount = await shown.count();
		expect(shownCount).toBeGreaterThan(0);
		expect(shownCount).toBeLessThan(total);
		for (const thread of await shown.all()) await expect(thread).toHaveAttribute('data-category', 'materias');

		await expect(forum.getByRole('heading', { name: 'Entra con tu correo UNL' })).toBeAttached();
		await expect(forum.locator('[data-step]').first()).toContainText('paso 1');
		await expect(forum.locator('[data-step]').first().locator('.forum-step-n')).toHaveText('01');
	});

	test('has a live feed of example activity that is marked as an example and scrolls while it is on screen', async ({
		page,
	}) => {
		await page.goto('/');
		const forum = page.locator('#foro');
		await expect(forum.getByRole('heading', { name: /Actividad reciente del foro \(ejemplo\)/ })).toBeAttached();
		await expect(forum.locator('.forum-live .forum-example')).toHaveText('ejemplo');
		const feed = forum.locator('[data-forum-feed]');
		await feed.scrollIntoViewIfNeeded();
		const last = () => feed.locator('li').last().locator('time').textContent();
		const before = await last();
		await expect.poll(last, { timeout: 8000 }).not.toBe(before);
		// Reduced motion keeps the lines it was drawn with.
		const quiet = await page.context().browser()!.newContext({ reducedMotion: 'reduce' });
		const still = await quiet.newPage();
		await still.goto('/');
		const first = await still.locator('[data-forum-feed] li').last().locator('time').textContent();
		await still.locator('[data-forum-feed]').scrollIntoViewIfNeeded();
		await still.waitForTimeout(3000);
		expect(await still.locator('[data-forum-feed] li').last().locator('time').textContent()).toBe(first);
		await quiet.close();
	});

	test.describe('without JS', () => {
		test.use({ javaScriptEnabled: false });

		test('hides the tabs and their command, and shows every thread', async ({ page }) => {
			await page.goto('/');
			const forum = page.locator('#foro');
			await expect(forum.getByRole('tablist')).toBeHidden();
			await expect(forum.getByText('$ git log --grep=')).toBeHidden();
			for (const thread of await forum.locator('[data-forum-thread]').all()) await expect(thread).toBeVisible();
		});
	});
});
