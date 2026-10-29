// The "languages" moment: the same sentence in five syntaxes, typed in one after another while the window is on screen.
// The typing itself is CSS (a cover that slides off, transform only); this only decides which snippet is showing. Never
// under reduced motion, where the first snippet stays as it was drawn.

const INTERVAL_MS = 3800;
const LEAVE_MS = 450;

export function initLanguages(box: HTMLElement): void {
	const items = Array.from(box.querySelectorAll<HTMLElement>('.lg'));
	const dots = Array.from(box.querySelectorAll<HTMLElement>('[data-lang-dots] i'));
	if (items.length < 2) return;
	let current = 0;
	let timer = 0;
	let visible = false;

	const next = () => {
		const out = items[current];
		out.classList.remove('on');
		out.classList.add('leaving');
		dots[current]?.classList.remove('on');
		window.setTimeout(() => out.classList.remove('leaving'), LEAVE_MS);
		current = (current + 1) % items.length;
		items[current].classList.remove('st', 'leaving');
		items[current].classList.add('on');
		dots[current]?.classList.add('on');
	};

	const sync = () => {
		const run = visible && !document.hidden;
		if (run && !timer) timer = window.setInterval(next, INTERVAL_MS);
		if (!run && timer) {
			window.clearInterval(timer);
			timer = 0;
		}
	};

	new IntersectionObserver(
		(entries) => {
			visible = entries.some((entry) => entry.isIntersecting);
			sync();
		},
		{ threshold: 0.4 },
	).observe(box);
	document.addEventListener('visibilitychange', sync);
}
