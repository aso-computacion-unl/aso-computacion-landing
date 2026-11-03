import { expect, test } from '@playwright/test';

// The news and forum sections of the home are terminals: `git log` rows with a `git show` pane beside them (news), and
// category tabs over example threads with the way in beside them (forum). The committed fallback has no news, so the
// news section is not on the page of a plain build: its tests skip when there are no rows, and run against a build
// with news (ADMIN_CONTENT_URL pointing at an admin).

test.describe('news terminal', () => {
	test('shows the post of the row under the pointer or focus, and each row links to its post', async ({ page }) => {
		await page.goto('/');
		const visor = page.locator('[data-news-visor]');
		const rows = visor.locator('[data-news-row]');
		const shows = visor.locator('[data-news-show]');
		const count = await rows.count();
		test.skip(count < 2, 'needs a build with at least two news items (the fallback has none)');

		await expect(shows.nth(0)).toBeVisible();
		await expect(rows.nth(0)).toHaveAttribute('data-active', 'true');
		for (let i = 1; i < count; i++) await expect(shows.nth(i)).toBeHidden();

		await rows.nth(1).hover();
		await expect(shows.nth(1)).toBeVisible();
		await expect(shows.nth(0)).toBeHidden();
		await expect(rows.nth(1)).toHaveAttribute('data-active', 'true');
		await expect(rows.nth(0)).toHaveAttribute('data-active', 'false');

		await rows.nth(count - 1).focus();
		await expect(shows.nth(count - 1)).toBeVisible();
		await expect(shows.nth(1)).toBeHidden();

		const title = (
			await rows
				.nth(count - 1)
				.locator('.news-row-title')
				.textContent()
		)?.trim();
		await expect(shows.nth(count - 1).getByRole('heading', { level: 3 })).toHaveText(title ?? '');
		const href = await rows.nth(count - 1).getAttribute('href');
		expect(href).toMatch(/\/novedades\/[^/]+\/?$/);
		await expect(shows.nth(count - 1).getByRole('link', { name: /Leer novedad/ })).toHaveAttribute('href', href ?? '');
	});

	test.describe('without JS', () => {
		test.use({ javaScriptEnabled: false });

		test('shows the newest post and keeps every row as a link', async ({ page }) => {
			await page.goto('/');
			const visor = page.locator('[data-news-visor]');
			const rows = await visor.locator('[data-news-row]').all();
			test.skip(rows.length === 0, 'the build has no news, so the section is not on the page');

			await expect(visor.locator('[data-news-show]').first()).toBeVisible();
			for (const row of rows) {
				await expect(row).toHaveAttribute('href', /\/novedades\//);
			}
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
