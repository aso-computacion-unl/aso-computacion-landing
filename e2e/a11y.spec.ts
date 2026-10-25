import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// axe-core over the pages of the fallback build, in both themes (the colours differ), with motion reduced so the
// pre-animation state does not hide anything. Serious and critical violations fail the run.
const pages = ['/', '/en/', '/novedades/'];
// The fallback has no news today; when it has some, the first post is scanned too.
const fallback = JSON.parse(readFileSync('src/data/fallback.json', 'utf8')) as { news: { slug: string }[] };
const [firstPost] = fallback.news;
if (firstPost) pages.push(`/novedades/${firstPost.slug}/`);

const BLOCKING = ['serious', 'critical'];

test.use({ reducedMotion: 'reduce' });

for (const theme of ['dark', 'light'] as const) {
	for (const path of pages) {
		test(`${path} has no serious or critical axe violations (${theme} theme)`, async ({ page }) => {
			await page.addInitScript((value) => localStorage.setItem('aso-theme', value), theme);
			await page.goto(path, { waitUntil: 'networkidle' });
			await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

			const { violations } = await new AxeBuilder({ page }).analyze();
			const blocking = violations.filter((violation) => BLOCKING.includes(violation.impact ?? ''));
			// Strings, not the raw results, so a failure prints what to fix and where.
			const report = blocking.map(
				(violation) =>
					`${violation.id} (${violation.impact}): ${violation.help}\n` +
					violation.nodes.map((node) => `  ${node.target.join(' ')}  ${node.html}`).join('\n'),
			);
			expect(report).toEqual([]);
		});
	}
}
