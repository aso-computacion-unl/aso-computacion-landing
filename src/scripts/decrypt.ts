// The "decrypt" moment of the Novedades title: scrambled symbols resolve into the real letters, once, when the title
// first comes into view. The timing is pure so it can be tested; `initDecrypt` wires it to the markup of SectionHead.astro
// (`data-decrypt` on an aria-hidden copy of the title; the real text is in an sr-only copy next to it).

// Symbols only: while it is scrambled the title never spells another word.
export const GLYPHS = '01{}[]<>/\\#$%&*+=?;:_-';

const BEAT_MS = 320;
const STAGGER_MS = 62;
const JITTER_MS = 80;

// When each character resolves, in ms after the start: a short beat, then one after another with a little jitter.
export const revealTimes = (length: number, random: () => number): number[] =>
	Array.from({ length }, (_, index) => BEAT_MS + index * STAGGER_MS + random() * JITTER_MS);

const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

// Every letter keeps the width it has when resolved, so scrambling moves nothing around it.
function arm(element: HTMLElement) {
	const text = element.textContent ?? '';
	const node = element.firstChild;
	if (!text || node?.nodeType !== Node.TEXT_NODE) return;
	const range = document.createRange();
	const widths = Array.from(text, (_, index) => {
		range.setStart(node, index);
		range.setEnd(node, index + 1);
		return range.getBoundingClientRect().width;
	});
	element.textContent = '';
	const slots = Array.from(text, (char, index) => {
		if (char === ' ') {
			element.append(' ');
			return undefined;
		}
		const slot = document.createElement('span');
		slot.className = 'dc';
		slot.style.width = `${widths[index].toFixed(2)}px`;
		slot.textContent = glyph();
		element.append(slot);
		return { slot, char, index };
	}).filter((slot) => slot !== undefined);

	const run = () => {
		const start = performance.now();
		const at = revealTimes(text.length, Math.random);
		let last = 0;
		let open = slots.length;
		const frame = (now: number) => {
			const swap = now - start - last > 55;
			for (const item of slots) {
				if (!item.slot.isConnected || item.slot.classList.contains('ok')) continue;
				if (now - start >= at[item.index]) {
					item.slot.textContent = item.char;
					item.slot.classList.add('ok');
					open -= 1;
				} else if (swap) item.slot.textContent = glyph();
			}
			if (swap) last = now - start;
			if (open > 0) requestAnimationFrame(frame);
			else element.textContent = text;
		};
		requestAnimationFrame(frame);
	};

	const observer = new IntersectionObserver(
		(entries) => {
			if (!entries.some((entry) => entry.isIntersecting)) return;
			observer.disconnect();
			run();
		},
		{ threshold: 0.6 },
	);
	observer.observe(element);
}

// Arms every `[data-decrypt]` once the fonts are in (the letters are measured), and never under reduced motion.
export function initDecrypt(): void {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-decrypt]'));
	if (targets.length === 0) return;
	void (document.fonts?.ready ?? Promise.resolve()).then(() => targets.forEach(arm));
}
