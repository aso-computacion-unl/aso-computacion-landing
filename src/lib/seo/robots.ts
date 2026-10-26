// robots.txt, written from the configured `site` so a domain change needs no edit here.
export const SITEMAP_PATH = '/sitemap-index.xml';

// A preview build shows drafts: keep every crawler out and advertise nothing.
export function buildRobotsTxt(site: URL, options: { preview?: boolean } = {}): string {
	if (options.preview) return 'User-agent: *\nDisallow: /\n';
	return `User-agent: *\nAllow: /\n\nSitemap: ${new URL(SITEMAP_PATH, site).href}\n`;
}
