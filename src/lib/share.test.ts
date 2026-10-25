import { describe, expect, it } from 'vitest';
import { buildShareLinks, shareMode } from './share';

const post = { url: 'https://example.org/novedades/taller-de-git/', title: 'Taller de Git: ¡inscríbete & aprende!' };
const params = (href: string) => new URL(href).searchParams;

describe('buildShareLinks', () => {
	it('points each network at its own share endpoint over https', () => {
		const links = buildShareLinks(post);
		expect(new URL(links.whatsapp).origin + new URL(links.whatsapp).pathname).toBe('https://wa.me/');
		expect(new URL(links.x).origin + new URL(links.x).pathname).toBe('https://x.com/intent/post');
		expect(new URL(links.linkedin).origin + new URL(links.linkedin).pathname).toBe(
			'https://www.linkedin.com/sharing/share-offsite/',
		);
	});

	it('shares the canonical URL, and the title where the network takes one', () => {
		const links = buildShareLinks(post);
		expect(params(links.whatsapp).get('text')).toBe(`${post.title} ${post.url}`);
		expect(params(links.x).get('text')).toBe(post.title);
		expect(params(links.x).get('url')).toBe(post.url);
		expect(params(links.linkedin).get('url')).toBe(post.url);
	});

	it('writes spaces as %20, never as +', () => {
		const links = buildShareLinks({ url: post.url, title: 'dos palabras' });
		expect(links.x).toContain('text=dos%20palabras');
		expect(links.whatsapp).not.toContain('+');
	});

	it('encodes what would break the query string', () => {
		const url = 'https://example.org/novedades/a/?x=1&y=2#top';
		const links = buildShareLinks({ url, title: 'a&b=c #1 100%' });
		expect(links.x.split('?')[1].split('&')).toHaveLength(2);
		expect(params(links.x).get('text')).toBe('a&b=c #1 100%');
		expect(params(links.x).get('url')).toBe(url);
		expect(params(links.linkedin).get('url')).toBe(url);
		expect(links.whatsapp.split('?')[1].split('&')).toHaveLength(1);
	});
});

describe('shareMode', () => {
	it('uses the native share sheet alone when the browser has one', () => {
		expect(shareMode({ canShare: true, canCopy: true })).toEqual({ native: true, links: false, copy: false });
		expect(shareMode({ canShare: true, canCopy: false })).toEqual({ native: true, links: false, copy: false });
	});

	it('falls back to the three links plus a copy button', () => {
		expect(shareMode({ canShare: false, canCopy: true })).toEqual({ native: false, links: true, copy: true });
	});

	it('keeps the links and drops the copy button when the clipboard is unavailable', () => {
		expect(shareMode({ canShare: false, canCopy: false })).toEqual({ native: false, links: true, copy: false });
	});
});
