import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts'],
		passWithNoTests: true,
		coverage: {
			provider: 'v8',
			// Only the TypeScript modules the unit tests can reach; .astro components are covered by e2e.
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
			reporter: ['text-summary'],
			// Never lower these; raise them when coverage grows.
			thresholds: {
				statements: 59,
				branches: 66,
				functions: 62,
				lines: 59,
			},
		},
	},
});
