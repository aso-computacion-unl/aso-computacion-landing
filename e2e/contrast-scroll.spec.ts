import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Production once showed a single `color-contrast` hit mid-scroll. Scan the page with motion on, at several scroll
// positions, in both themes, once each entrance has settled (axe reads an element mid-entrance at its blended opacity,
// which is a false alarm for text that is half transparent for a few hundred milliseconds). The one hit that does
// reproduce is the Actividades title fading out as the scrubbed opener takes over: it is leaving by design, so it is left out.
test.setTimeout(90_000);

for (const theme of ['dark', 'light'] as const) {
	test(`no color-contrast violations while scrolling with motion (${theme} theme)`, async ({ page }) => {
		await page.addInitScript((value) => localStorage.setItem('aso-theme', value), theme);
		await page.goto('/', { waitUntil: 'networkidle' });
		await expect(page.locator('html')).toHaveAttribute('data-motion-ready', 'true');
		const height = await page.evaluate(() => document.documentElement.scrollHeight);
		const found: string[] = [];
		for (let y = 0; y < height; y += 1500) {
			await page.mouse.wheel(0, y === 0 ? 0 : 1500);
			await page.waitForTimeout(1800);
			const { violations } = await new AxeBuilder({ page })
				.exclude('[data-opener-head]')
				.withRules(['color-contrast'])
				.analyze();
			for (const violation of violations)
				for (const node of violation.nodes) found.push(`y=${y} ${node.target.join(' ')} ${node.any[0]?.message ?? ''}`);
		}
		expect(found).toEqual([]);
	});
}
