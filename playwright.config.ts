import { defineConfig, devices } from '@playwright/test';

// Browser tests run against `astro preview` of the build in dist/, so run `pnpm build` first. The build needs no
// ADMIN_CONTENT_URL: it uses the committed fallback content, which is also what CI tests. Chromium only.
const PORT = 4321;

export default defineConfig({
	testDir: 'e2e',
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['list'], ['github']] : 'list',
	use: {
		baseURL: `http://127.0.0.1:${PORT}`,
		trace: 'retain-on-failure',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		// --ignore-lock keeps it a plain foreground server: without it Astro backgrounds `preview` when an AI agent runs
		// it, and Playwright would think the server died.
		command: `pnpm exec astro preview --ignore-lock --host 127.0.0.1 --port ${PORT}`,
		url: `http://127.0.0.1:${PORT}`,
		reuseExistingServer: !process.env.CI,
	},
});
