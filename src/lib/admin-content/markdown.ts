// Renders a news `body` (a small Markdown subset) to HTML. Pure, no dependencies, and safe by construction: the output
// is built only from the tags below, and every character of the source reaches it through `escapeHtml`, so the text
// can carry no markup. The only tags are p, ul, li, strong, em, a and the span of the link notice. Supported:
//   - paragraphs (blank-line separated) and `- ` lists
//   - **bold**, *italic* (nestable) and [text](https://...) links
//   - `\` before one of \ * [ ] ( ) - _ keeps it literal
// Anything else (raw HTML, headings, quotes, images, ordered lists) is plain text. A link whose URL is not a plain
// https one (javascript:, data:, http:, relative, credentials...) is not a link: its Markdown stays as text.

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (char) => ESCAPES[char]);

// Links open in a new tab: say so to screen readers (`sr-only` is the landing's visually-hidden utility).
const NEW_TAB_NOTICE = '<span class="sr-only"> (se abre en otra pestaña)</span>';
const LITERAL_AFTER_BACKSLASH = '\\*[]()-_';
// The character after `https://` must start a host; quotes, angle brackets, backticks and backslashes never belong.
const HTTPS_URL = /^https:\/\/[^\s/\\?#@<>"'`][^\s\\<>"'`]*$/i;
// Emphasis nested deeper than this is shown as text: bounds the recursion for hostile bodies.
const MAX_DEPTH = 6;
// Looking for a closing marker can rescan the same text; this many scanned characters per body is far more than any
// real article needs, and past it the remaining markers simply stay text. It bounds the time on hostile bodies.
const SCAN_BUDGET = 400_000;

interface Budget {
	left: number;
}

const isSpace = (char: string | undefined) => char === undefined || /\s/.test(char);

// Returns the normalized URL when `url` is a plain https link, otherwise null.
const safeHttps = (url: string): string | null => {
	if (!HTTPS_URL.test(url)) return null;
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'https:' && parsed.hostname !== '' && !parsed.username && !parsed.password ? parsed.href : null;
	} catch {
		return null;
	}
};

// A closing marker is valid when it ends non-empty content that neither starts nor ends with whitespace.
const closes = (source: string, from: number, at: number) => at > from && !isSpace(source[from]) && !isSpace(source[at - 1]);

// Index of the `*` or `**` that closes a span whose content starts at `from`, or -1.
function findClose(source: string, from: number, marker: '*' | '**', budget: Budget): number {
	let index = from;
	while (index < source.length) {
		budget.left -= 1;
		if (budget.left < 0) return -1;
		if (source[index] === '\\') {
			index += 2;
			continue;
		}
		if (source[index] !== '*') {
			index += 1;
			continue;
		}
		let run = 1;
		while (source[index + run] === '*') run += 1;
		if (marker === '**') {
			// In a run of stars the last two close, so `***both***` is bold around italic.
			if (run >= 2 && closes(source, from, index + run - 2)) return index + run - 2;
			index += run;
		} else if (run === 1) {
			if (closes(source, from, index)) return index;
			index += 1;
		} else {
			// A bold span inside the italic one: jump over it.
			const nested = findClose(source, index + 2, '**', budget);
			index = nested === -1 ? index + run : nested + 2;
		}
	}
	return -1;
}

// `[text](url)` starting at `start`: its end and rendered HTML, or null when it is not a valid https link.
function readLink(source: string, start: number, depth: number, budget: Budget): { end: number; html: string } | null {
	let close = start + 1;
	while (close < source.length && source[close] !== ']') {
		if (source[close] === '[') return null;
		close += source[close] === '\\' ? 2 : 1;
	}
	if (source[close] !== ']' || source[close + 1] !== '(') return null;
	const end = source.indexOf(')', close + 2);
	if (end === -1) return null;
	const href = safeHttps(source.slice(close + 2, end));
	const label = source.slice(start + 1, close);
	if (!href || label.trim() === '') return null;
	return {
		end: end + 1,
		html: `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${inline(label, true, depth + 1, budget)}${NEW_TAB_NOTICE}</a>`,
	};
}

function inline(source: string, inLink: boolean, depth: number, budget: Budget): string {
	if (depth > MAX_DEPTH) return escapeHtml(source);
	let html = '';
	let index = 0;
	while (index < source.length) {
		const char = source[index];
		if (char === '\\' && index + 1 < source.length && LITERAL_AFTER_BACKSLASH.includes(source[index + 1])) {
			html += escapeHtml(source[index + 1]);
			index += 2;
			continue;
		}
		if (char === '*') {
			const markers: ('*' | '**')[] = source.startsWith('**', index) ? ['**', '*'] : ['*'];
			let matched = false;
			for (const marker of markers) {
				const from = index + marker.length;
				const close = findClose(source, from, marker, budget);
				if (close === -1) continue;
				const tag = marker === '**' ? 'strong' : 'em';
				html += `<${tag}>${inline(source.slice(from, close), inLink, depth + 1, budget)}</${tag}>`;
				index = close + marker.length;
				matched = true;
				break;
			}
			if (matched) continue;
		}
		if (char === '[' && !inLink) {
			const link = readLink(source, index, depth, budget);
			if (link) {
				html += link.html;
				index = link.end;
				continue;
			}
		}
		html += escapeHtml(char);
		index += 1;
	}
	return html;
}

const LIST_ITEM = /^ {0,3}-[ \t]+(\S.*)$/;

export function renderMarkdown(body: string): string {
	const html: string[] = [];
	const budget: Budget = { left: SCAN_BUDGET };
	let paragraph: string[] = [];
	let items: string[] = [];

	const endParagraph = () => {
		if (paragraph.length > 0) html.push(`<p>${inline(paragraph.join('\n'), false, 0, budget)}</p>`);
		paragraph = [];
	};
	const endList = () => {
		if (items.length > 0) html.push(`<ul>${items.map((item) => `<li>${inline(item, false, 0, budget)}</li>`).join('')}</ul>`);
		items = [];
	};

	for (const line of body.replace(/\r\n?/g, '\n').split('\n')) {
		if (line.trim() === '') {
			endParagraph();
			endList();
			continue;
		}
		const item = LIST_ITEM.exec(line);
		if (item) {
			endParagraph();
			items.push(item[1].trim());
		} else {
			endList();
			paragraph.push(line.trim());
		}
	}
	endParagraph();
	endList();
	return html.join('');
}
