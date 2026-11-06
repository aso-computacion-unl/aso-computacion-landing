import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// The other axe specs run with motion reduced. This one runs after the hero's letter split (the animation is on), which
// is where the production scan found aria-label on the headline's line spans.
const pages = [
	{ path: '/', name: 'ASO Computación: Entérate de lo que pasa en Computación.' },
	{ path: '/en/', name: 'ASO Computación: Keep up with what is going on in Computer Science.' },
];

for (const theme of ['dark', 'light'] as const) {
	for (const { path, name } of pages) {
		test(`${path} headline keeps its name and has no axe violations after the split (${theme} theme)`, async ({
			page,
		}) => {
			await page.addInitScript((value) => localStorage.setItem('aso-theme', value), theme);
			await page.goto(path, { waitUntil: 'networkidle' });
			await expect(page.locator('html')).toHaveAttribute('data-motion-ready', 'true');
			await expect(page.locator('.hero .split-char').first()).toBeAttached();
			// The intro is over once the last piece (the shortcuts) is in.
			await expect(page.locator('.hero .gates li').last()).toHaveCSS('opacity', '1', { timeout: 6000 });
			await page.waitForTimeout(1500);

			await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
			const { violations } = await new AxeBuilder({ page }).analyze();
			const report = violations.map(
				(violation) =>
					`${violation.id} (${violation.impact}): ${violation.help}\n` +
					violation.nodes.map((node) => `  ${node.target.join(' ')}  ${node.html}`).join('\n'),
			);
			expect(report).toEqual([]);
		});
	}
}
