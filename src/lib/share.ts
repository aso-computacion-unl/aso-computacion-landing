// Sharing a news post. Pure: the post page prints the links as plain anchors (they work without JS), and
// src/scripts/share.ts upgrades them with the browser's own share sheet or a copy button when it can.

export interface ShareTarget {
	// The post's canonical URL (canonicalUrl in ./seo/meta.ts).
	url: string;
	title: string;
}

export interface ShareLinks {
	whatsapp: string;
	x: string;
	linkedin: string;
}

// encodeURIComponent, not URLSearchParams: a space must be %20, which every network reads (a "+" may show up literally).
const link = (base: string, params: Record<string, string>): string =>
	`${base}?${Object.entries(params)
		.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
		.join('&')}`;

export const buildShareLinks = ({ url, title }: ShareTarget): ShareLinks => ({
	whatsapp: link('https://wa.me/', { text: `${title} ${url}` }),
	x: link('https://x.com/intent/post', { text: title, url }),
	linkedin: link('https://www.linkedin.com/sharing/share-offsite/', { url }),
});

export interface ShareCapabilities {
	// `navigator.share` exists.
	canShare: boolean;
	// `navigator.clipboard.writeText` exists (it needs a secure context).
	canCopy: boolean;
}

// Which controls to show: the native sheet already lists every app, so with it the links and the copy button go.
export const shareMode = ({ canShare, canCopy }: ShareCapabilities) => ({
	native: canShare,
	links: !canShare,
	copy: !canShare && canCopy,
});
