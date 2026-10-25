// robots.txt, written from the configured `site` so a domain change needs no edit here.
export const SITEMAP_PATH = '/sitemap-index.xml';

export function buildRobotsTxt(site: URL): string {
	return `User-agent: *\nAllow: /\n\nSitemap: ${new URL(SITEMAP_PATH, site).href}\n`;
}
