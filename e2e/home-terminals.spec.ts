import { expect, test } from '@playwright/test';

// The news and forum sections of the home are teasers: a few titles as plain links and a button to the page that has the
// rest (the forum also keeps the sign-in card beside its titles). The committed fallback has no news, so the news section
// is not on the page of a plain build: its tests skip when there are no rows, and run against a build with news
// (ADMIN_CONTENT_URL pointing at an admin). The fallback has no admin origin either, so the forum links only exist in
// a build with one.

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

test.describe('forum teaser', () => {
	test('shows at most three example threads beside the sign-in card, with no tabs and no feed', async ({ page }) => {
		await page.goto('/');
		const forum = page.locator('#foro');
		const rows = forum.locator('.forum-list li');
		const count = await rows.count();
		expect(count).toBeGreaterThan(0);
		expect(count).toBeLessThanOrEqual(3);
		for (let i = 0; i < count; i++) await expect(rows.nth(i).locator('.forum-title')).not.toBeEmpty();

		await expect(forum.getByRole('heading', { name: 'Entra con tu correo UNL' })).toBeVisible();
		// The terminal bits are gone: no category tabs, no grep prompt, no live feed, no steps.
		await expect(forum.getByRole('tablist')).toHaveCount(0);
		await expect(forum.getByText('$ git log --grep=')).toHaveCount(0);
		await expect(forum.locator('[data-forum-feed], [data-forum-thread], .forum-steps')).toHaveCount(0);
		// The example threads stay marked as demo content.
		await expect(forum.locator('header .demo-tag')).toHaveCount(1);
	});

	test('sends every thread and one button to the forum on the admin, which also holds the door', async ({ page }) => {
		await page.goto('/');
		const forum = page.locator('#foro');
		const links = forum.locator('a[href^="http"]');
		// Without an admin origin (the committed fallback build) there is no way in: nothing links out, nothing is broken.
		const hasForum = (await links.count()) > 0;
		if (!hasForum) {
			await expect(forum.locator('a.forum-link')).toHaveCount(0);
			await expect(forum.getByRole('link', { name: /Ver todos los hilos/ })).toHaveCount(0);
			return;
		}
		const all = forum.getByRole('link', { name: /Ver todos los hilos/ });
		await expect(all).toHaveCount(1);
		const href = (await all.getAttribute('href')) ?? '';
		expect(new URL(href).pathname).toMatch(/^\/foro/);
		for (const row of await forum.locator('a.forum-link').all()) await expect(row).toHaveAttribute('href', href);
		await expect(forum.getByRole('link', { name: /Entrar con Google/ })).toHaveAttribute('href', href);
		// The button closes the thread column, in line with the bottom of the (taller) sign-in card.
		if ((page.viewportSize()?.width ?? 1280) >= 1024) {
			const door = await forum.locator('.forum-door').boundingBox();
			const button = await all.boundingBox();
			expect(door && button && Math.abs(door.y + door.height - (button.y + button.height))).toBeLessThan(8);
		}
	});

	test('keeps the arrow beside the title on a phone', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 800 });
		await page.goto('/');
		const row = page.locator('#foro .forum-link').first();
		const title = await row.locator('.forum-title').boundingBox();
		const kind = await row.locator('.forum-kind').boundingBox();
		expect(title && kind && kind.y + kind.height <= title.y + 1).toBe(true);
		const arrow = row.locator('.forum-arrow');
		if ((await arrow.count()) > 0) {
			const box = await arrow.boundingBox();
			expect(title && box && box.y < title.y + title.height).toBe(true);
		}
	});

	test.describe('without JS', () => {
		test.use({ javaScriptEnabled: false });

		test('shows the same teaser as plain markup', async ({ page }) => {
			await page.goto('/');
			const forum = page.locator('#foro');
			await expect(forum.locator('.forum-list li').first()).toBeVisible();
			await expect(forum.getByRole('heading', { name: 'Entra con tu correo UNL' })).toBeVisible();
		});
	});
});
