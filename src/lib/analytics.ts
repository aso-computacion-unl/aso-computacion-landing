// Cloudflare Web Analytics: a cookie-free beacon, rendered by Layout.astro only when the build has a token
// (PUBLIC_CF_BEACON_TOKEN), so local and CI builds carry no analytics at all.
const BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';

export function cloudflareBeacon(token: string | undefined): { src: string; config: string } | null {
	const value = token?.trim();
	if (!value) return null;
	// `config` goes in the data-cf-beacon attribute; Astro escapes the quotes when it prints it.
	return { src: BEACON_SRC, config: JSON.stringify({ token: value }) };
}
