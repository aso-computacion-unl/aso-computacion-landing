import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

const LINK = 'target="_blank" rel="noopener noreferrer"';
const NOTICE = '<span class="sr-only"> (se abre en otra pestaña)</span>';

// Everything the renderer is allowed to emit.
const ALLOWED_TAGS =
	/<\/?(?:p|ul|li|strong|em)>|<a href="https:\/\/[^"<>\s]*" target="_blank" rel="noopener noreferrer">|<\/a>|<span class="sr-only">|<\/span>/g;

describe('renderMarkdown: blocks', () => {
	it('renders paragraphs separated by blank lines', () => {
		expect(renderMarkdown('Uno.\n\nDos.')).toBe('<p>Uno.</p><p>Dos.</p>');
	});

	it('keeps single line breaks inside one paragraph and ignores extra blank lines and CRLF', () => {
		expect(renderMarkdown('a\r\nb\r\n\r\n\r\n\r\nc\n')).toBe('<p>a\nb</p><p>c</p>');
	});

	it('renders `- ` lists, and a list may follow a paragraph without a blank line', () => {
		expect(renderMarkdown('Antes:\n- uno\n- **dos**\n\nDespués.')).toBe(
			'<p>Antes:</p><ul><li>uno</li><li><strong>dos</strong></li></ul><p>Después.</p>',
		);
	});

	it('ends a list at the first line that is not an item', () => {
		expect(renderMarkdown('- uno\ntexto\n- dos')).toBe('<ul><li>uno</li></ul><p>texto</p><ul><li>dos</li></ul>');
	});

	it('does not read other Markdown as structure: headings, quotes, ordered lists and `*` bullets stay text', () => {
		expect(renderMarkdown('# Título')).toBe('<p># Título</p>');
		expect(renderMarkdown('> cita')).toBe('<p>&gt; cita</p>');
		expect(renderMarkdown('1. uno')).toBe('<p>1. uno</p>');
		expect(renderMarkdown('-sin espacio')).toBe('<p>-sin espacio</p>');
	});

	it('returns nothing for a blank body', () => {
		expect(renderMarkdown('')).toBe('');
		expect(renderMarkdown(' \n\n ')).toBe('');
	});
});

describe('renderMarkdown: emphasis', () => {
	it('renders **bold** and *italic*', () => {
		expect(renderMarkdown('a **b** y *c*')).toBe('<p>a <strong>b</strong> y <em>c</em></p>');
	});

	it('nests them', () => {
		expect(renderMarkdown('**a *b* c**')).toBe('<p><strong>a <em>b</em> c</strong></p>');
		expect(renderMarkdown('*a **b** c*')).toBe('<p><em>a <strong>b</strong> c</em></p>');
		expect(renderMarkdown('***ambos***')).toBe('<p><strong><em>ambos</em></strong></p>');
	});

	it('leaves unmatched or empty markers as text', () => {
		expect(renderMarkdown('2 * 3 = 6')).toBe('<p>2 * 3 = 6</p>');
		expect(renderMarkdown('**sin cierre')).toBe('<p>**sin cierre</p>');
		expect(renderMarkdown('*sin cierre')).toBe('<p>*sin cierre</p>');
		expect(renderMarkdown('**** y **')).toBe('<p>**** y **</p>');
	});

	it('does not cross paragraphs or list items', () => {
		expect(renderMarkdown('**a\n\nb**')).toBe('<p>**a</p><p>b**</p>');
		expect(renderMarkdown('- *a\n- b*')).toBe('<ul><li>*a</li><li>b*</li></ul>');
	});

	it('lets a backslash keep a marker literal', () => {
		expect(renderMarkdown('\\*no\\* y \\[x\\]')).toBe('<p>*no* y [x]</p>');
		expect(renderMarkdown('doble \\\\ barra')).toBe('<p>doble \\ barra</p>');
	});
});

describe('renderMarkdown: links', () => {
	it('renders https links that open in a new tab with rel noopener noreferrer', () => {
		expect(renderMarkdown('[ASO](https://aso.example/inscripcion)')).toBe(
			`<p><a href="https://aso.example/inscripcion" ${LINK}>ASO${NOTICE}</a></p>`,
		);
	});

	it('allows emphasis in the link text', () => {
		expect(renderMarkdown('[**ASO**](https://aso.example/)')).toBe(
			`<p><a href="https://aso.example/" ${LINK}><strong>ASO</strong>${NOTICE}</a></p>`,
		);
	});

	it('rejects every scheme but https, leaving the Markdown as plain text', () => {
		for (const url of [
			'http://aso.example',
			'javascript:alert(1)',
			'JavaScript:alert(1)',
			'data:text/html,<b>x</b>',
			'mailto:a@b.c',
			'ftp://x.y',
			'//aso.example',
			'/relativo',
			'aso.example',
			'vbscript:x',
			' javascript:x',
		]) {
			const html = renderMarkdown(`[clic](${url})`);
			expect(html, url).not.toContain('<a');
			expect(html, url).not.toContain('href');
			expect(html, url).toContain('[clic]');
		}
	});

	it('rejects https URLs with credentials, whitespace or an empty host', () => {
		for (const url of [
			'https://user:pw@aso.example',
			'https://google.com@evil.example',
			'https://',
			'https:///x',
			'https://a b.example',
		]) {
			expect(renderMarkdown(`[x](${url})`), url).not.toContain('<a');
		}
	});

	it('escapes the URL and the text, so a quote cannot leave the attribute', () => {
		const html = renderMarkdown('[<img src=x onerror=alert(1)>](https://aso.example/?a="b"&c=<d>)');
		expect(html).not.toMatch(/<img/i);
		expect(html.replace(ALLOWED_TAGS, '')).not.toMatch(/[<>]/);
		expect(html).not.toContain('"b"');
	});

	it('does not nest links and keeps unmatched brackets as text', () => {
		expect(renderMarkdown('[[a](https://x.example)](https://y.example)')).not.toMatch(/<a[^>]*><a/);
		expect(renderMarkdown('[sin url] y [a](')).toBe('<p>[sin url] y [a](</p>');
	});
});

describe('renderMarkdown: no raw HTML, ever', () => {
	const hostile = [
		'<script>alert(1)</script>',
		'<img src=x onerror=alert(1)>',
		'<a href="javascript:alert(1)">x</a>',
		'<iframe src="https://evil.example"></iframe>',
		'**<b>x</b>** *<i>y</i>* [<u>z</u>](https://ok.example)',
		'- <li onclick=alert(1)>x',
		'&lt;script&gt; &amp; &#60;b&#62;',
		'"quoted" \'single\' `code` <!-- c -->',
		'[x](https://ok.example/"><script>alert(1)</script>)',
		'<<script>script>',
	];

	it('escapes the text', () => {
		expect(renderMarkdown('<b>x</b> & "y"')).toBe('<p>&lt;b&gt;x&lt;/b&gt; &amp; &quot;y&quot;</p>');
		expect(renderMarkdown('&lt;')).toBe('<p>&amp;lt;</p>');
	});

	it('escapes a literal copy of the link notice instead of trusting it', () => {
		expect(renderMarkdown('<span class="sr-only">x</span>')).toBe(
			'<p>&lt;span class=&quot;sr-only&quot;&gt;x&lt;/span&gt;</p>',
		);
	});

	it('emits only the allowed tags for any input', () => {
		for (const input of hostile) {
			const html = renderMarkdown(input);
			expect(html.replace(ALLOWED_TAGS, ''), input).not.toMatch(/[<>]/);
		}
	});

	it('never puts a quote or angle bracket in an href', () => {
		for (const input of hostile) {
			for (const [, href] of renderMarkdown(input).matchAll(/href="([^"]*)"/g))
				expect(href, input).toMatch(/^https:\/\/[^"<>\s]+$/);
		}
	});
});

describe('renderMarkdown: hostile size', () => {
	it('stays fast and bounded on pathological 10 000-character bodies', () => {
		const bodies = [
			'*'.repeat(10_000),
			'**a '.repeat(2_500),
			'['.repeat(10_000),
			'[a]('.repeat(2_000),
			'\\'.repeat(10_000),
			'*a '.repeat(3_333),
			'*'.repeat(5_000) + 'x' + '*'.repeat(4_999),
		];
		for (const body of bodies) {
			const started = performance.now();
			const html = renderMarkdown(body);
			expect(performance.now() - started, body.slice(0, 8)).toBeLessThan(1_000);
			expect(html.replace(ALLOWED_TAGS, '')).not.toMatch(/[<>]/);
		}
	});

	it('shows emphasis nested deeper than the limit as text instead of recursing', () => {
		const deep = `${'*a **'.repeat(40)}x${'** a*'.repeat(40)}`;
		expect(() => renderMarkdown(deep)).not.toThrow();
	});
});
