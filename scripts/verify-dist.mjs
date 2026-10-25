// Checks the files `pnpm build` leaves in dist/ for the SEO, sharing and hosting basics: they exist and carry their
// key lines. Run it after a build: `pnpm verify:dist`. Exits with a non-zero code listing every failure.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dist = (path) => fileURLToPath(new URL(`../dist/${path}`, import.meta.url));
const read = (path) => (existsSync(dist(path)) ? readFileSync(dist(path), 'utf8') : null);

// [file, [text it must contain]]
const expectations = [
	['robots.txt', ['User-agent: *', 'Sitemap: https://', '/sitemap-index.xml']],
	['sitemap-index.xml', ['<sitemap>', 'sitemap-0.xml']],
	['sitemap-0.xml', ['hreflang="es-EC"', 'hreflang="en-US"']],
	['novedades/rss.xml', ['<rss version="2.0">', '<language>es</language>']],
	['en/novedades/rss.xml', ['<rss version="2.0">', '<language>en</language>']],
	['og-default.png', []],
	[
		'index.html',
		['rel="canonical"', 'property="og:image"', 'name="twitter:card"', 'application/ld+json', 'application/rss+xml'],
	],
];

const failures = [];
for (const [file, needles] of expectations) {
	const content = read(file);
	if (content === null) {
		failures.push(`${file}: missing`);
		continue;
	}
	for (const needle of needles) if (!content.includes(needle)) failures.push(`${file}: missing "${needle}"`);
}

if (failures.length > 0) {
	console.error(`dist check failed:\n- ${failures.join('\n- ')}`);
	process.exit(1);
}
console.log(`dist check passed (${expectations.length} files)`);
