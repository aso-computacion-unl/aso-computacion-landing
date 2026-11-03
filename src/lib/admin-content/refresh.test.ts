import { describe, expect, it } from 'vitest';
import { RETRY_AFTER_MS, shouldRetryLoad } from './refresh';

const base = {
	dev: true,
	source: 'fallback' as const,
	url: 'http://localhost:3000/api/public/content',
	triedAt: 1_000,
	now: 1_000 + RETRY_AFTER_MS,
};

describe('shouldRetryLoad: a dev server that started while the admin was down', () => {
	it('asks the admin again once the pause is over', () => {
		expect(shouldRetryLoad(base)).toBe(true);
	});

	it('waits while the last try is recent, so a burst of requests asks the admin once', () => {
		expect(shouldRetryLoad({ ...base, now: base.triedAt + RETRY_AFTER_MS - 1 })).toBe(false);
	});

	it('leaves real content alone', () => {
		expect(shouldRetryLoad({ ...base, source: 'api' })).toBe(false);
	});

	it('never retries a build: the content is resolved once per build', () => {
		expect(shouldRetryLoad({ ...base, dev: false })).toBe(false);
	});

	it('has nothing to ask when no admin is configured', () => {
		expect(shouldRetryLoad({ ...base, url: undefined })).toBe(false);
		expect(shouldRetryLoad({ ...base, url: '  ' })).toBe(false);
	});

	it('never retries a preview, which fails instead of falling back', () => {
		expect(shouldRetryLoad({ ...base, source: 'preview' })).toBe(false);
	});
});
