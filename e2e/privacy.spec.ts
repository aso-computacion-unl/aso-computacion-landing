import { expect, test } from '@playwright/test';

// The privacy policy Google requires for the OAuth app: it answers, shows its title, and the footer of the home links to it.
test('the footer links to the privacy policy', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('contentinfo').getByRole('link', { name: 'Privacidad' }).click();

	await expect(page).toHaveURL(/\/privacidad\/?$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Política de privacidad' })).toBeVisible();
	await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
});
