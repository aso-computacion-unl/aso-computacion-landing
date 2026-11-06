// The forum window on the home (S7): the category chips filter the example threads and the composer types the forum's
// own prompts. Everything is already in the markup (counts, the first prompt, all threads), so without this script, or
// under reduced motion, the window is complete and static. No GSAP: a timer and one observer.

export const ALL = 'all';

// How many threads each chip stands for, "all" included. Categories with no thread count zero.
export function categoryCounts(kinds: readonly string[], categories: readonly string[]): Record<string, number> {
	const counts: Record<string, number> = { [ALL]: kinds.length };
	for (const category of categories) counts[category] = kinds.filter((kind) => kind === category).length;
	return counts;
}

// One flag per thread, in order: whether the chosen chip lets it through.
export const visibleThreads = (kinds: readonly string[], selected: string): boolean[] =>
	kinds.map((kind) => selected === ALL || kind === selected);

export interface TypeState {
	line: number;
	chars: number;
	deleting: boolean;
}

export interface TypeFrame {
	text: string;
	// Milliseconds until the next frame.
	delay: number;
	state: TypeState;
}

const TYPE_MS = 42;
const ERASE_MS = 18;
const HOLD_MS = 1600;

// One step of the composer's typing: type a line, hold it, erase it twice as fast as it was typed, go to the next.
export function nextFrame({ line, chars, deleting }: TypeState, lines: readonly string[]): TypeFrame {
	const current = lines[line] ?? '';
	const text = current.slice(0, chars);
	if (!deleting && chars < current.length) return { text, delay: TYPE_MS, state: { line, chars: chars + 1, deleting } };
	if (!deleting) return { text, delay: HOLD_MS, state: { line, chars, deleting: true } };
	if (chars > 0) return { text, delay: ERASE_MS, state: { line, chars: Math.max(0, chars - 2), deleting } };
	return { text, delay: TYPE_MS, state: { line: (line + 1) % lines.length, chars: 0, deleting: false } };
}

export function initFilters(app: HTMLElement) {
	const chips = Array.from(app.querySelectorAll<HTMLButtonElement>('[data-forum-chip]'));
	const rows = Array.from(app.querySelectorAll<HTMLElement>('[data-forum-row]'));
	const status = app.querySelector<HTMLElement>('[data-forum-status]');
	const kinds = rows.map((row) => row.dataset.forumRow ?? '');

	const select = (chip: HTMLButtonElement) => {
		const selected = chip.dataset.forumChip ?? ALL;
		chips.forEach((other) => other.setAttribute('aria-pressed', String(other === chip)));
		const shown = visibleThreads(kinds, selected);
		rows.forEach((row, index) => (row.hidden = !shown[index]));
		if (status)
			status.textContent = (status.dataset.template ?? '')
				.replace('{count}', String(shown.filter(Boolean).length))
				.replace('{total}', String(rows.length));
	};
	chips.forEach((chip) => chip.addEventListener('click', () => select(chip)));
}

export function initTyping(app: HTMLElement) {
	const target = app.querySelector<HTMLElement>('[data-forum-typed]');
	if (!target) return;
	let lines: string[] = [];
	try {
		const parsed: unknown = JSON.parse(app.dataset.forumPrompts ?? '[]');
		lines = Array.isArray(parsed) ? parsed.filter((line): line is string => typeof line === 'string') : [];
	} catch {
		return;
	}
	if (lines.length < 2) return;

	// The markup already shows the first prompt: start by holding it, so the typing takes over without a flicker.
	let state: TypeState = { line: 0, chars: lines[0].length, deleting: false };
	let timer = 0;
	let visible = false;
	const tick = () => {
		const frame = nextFrame(state, lines);
		state = frame.state;
		target.textContent = frame.text;
		timer = window.setTimeout(tick, frame.delay);
	};
	// Typing only runs while the window is on screen and the tab is open: nothing ticks in the background.
	const sync = () => {
		window.clearTimeout(timer);
		if (visible && !document.hidden) tick();
	};
	new IntersectionObserver((entries) => {
		visible = entries.some((entry) => entry.isIntersecting);
		sync();
	}).observe(app);
	document.addEventListener('visibilitychange', sync);
}

const app = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('[data-forum-app]');
if (app) {
	initFilters(app);
	if (!matchMedia('(prefers-reduced-motion: reduce)').matches) initTyping(app);
}
