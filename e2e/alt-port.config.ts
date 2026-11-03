import { defineConfig } from '@playwright/test';
import path from 'node:path';
import base from '../playwright.config';

// The same suite on another port, for when a dev server holds 4321: `E2E_PORT=4322 pnpm exec playwright test -c e2e/alt-port.config.ts`.
const port = Number(process.env.E2E_PORT ?? 4322);

export default defineConfig({
	...base,
	testDir: import.meta.dirname,
	use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
	webServer: {
		command: `pnpm exec astro preview --ignore-lock --host 127.0.0.1 --port ${port}`,
		url: `http://127.0.0.1:${port}`,
		cwd: path.resolve(import.meta.dirname, '..'),
		reuseExistingServer: !process.env.CI,
	},
});
