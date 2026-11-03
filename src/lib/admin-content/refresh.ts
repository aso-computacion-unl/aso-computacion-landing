// When a dev server asks the admin again. The content is resolved once per process, which is right for a build but wrong
// for `astro dev`: a server that started while the admin answered 404 (or was not up yet) kept the committed fallback,
// with its demo cards and no tickets or news, until someone restarted it. Pure, so it is unit-tested.
export const RETRY_AFTER_MS = 5000;

export interface RetryState {
	// `astro dev`. A build resolves its content once and the production gate decides what may ship.
	dev: boolean;
	source: 'api' | 'fallback' | 'preview';
	// ADMIN_CONTENT_URL as configured.
	url: string | undefined;
	// Epoch milliseconds of the last try and of now.
	triedAt: number;
	now: number;
}

export const shouldRetryLoad = ({ dev, source, url, triedAt, now }: RetryState): boolean =>
	dev && source === 'fallback' && Boolean(url?.trim()) && now - triedAt >= RETRY_AFTER_MS;
