import { describe, expect, it } from 'vitest';
import { cloudflareBeacon } from './analytics';

describe('cloudflareBeacon', () => {
	it('renders nothing without a token, so local and CI builds stay clean', () => {
		expect(cloudflareBeacon(undefined)).toBeNull();
		expect(cloudflareBeacon('')).toBeNull();
		expect(cloudflareBeacon('   ')).toBeNull();
	});

	it('points at Cloudflare’s beacon with the token as its JSON config', () => {
		const beacon = cloudflareBeacon(' abc123 ');
		expect(beacon?.src).toBe('https://static.cloudflareinsights.com/beacon.min.js');
		expect(JSON.parse(beacon?.config ?? '')).toEqual({ token: 'abc123' });
	});

	it('keeps a token with quotes from breaking out of the JSON', () => {
		expect(JSON.parse(cloudflareBeacon('a"b')?.config ?? '')).toEqual({ token: 'a"b' });
	});
});
