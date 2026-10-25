import { describe, expect, it } from 'vitest';
import { buildRobotsTxt, SITEMAP_PATH } from './robots';

describe('buildRobotsTxt', () => {
	it('allows everything and points at the sitemap, absolute and from the site', () => {
		const txt = buildRobotsTxt(new URL('https://example.test'));
		expect(txt).toContain('User-agent: *\nAllow: /');
		expect(txt).toContain(`Sitemap: https://example.test${SITEMAP_PATH}`);
		expect(txt.endsWith('\n')).toBe(true);
	});

	it('follows the site when the domain changes', () => {
		expect(buildRobotsTxt(new URL('https://aso.example.org'))).toContain(
			`Sitemap: https://aso.example.org${SITEMAP_PATH}`,
		);
	});
});
