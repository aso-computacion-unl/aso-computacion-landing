// Small interactions that work with or without motion: countdown, activity filters, board cards on touch.
// Every one of them has a complete static fallback in the HTML.

// Countdown: days until the next dated upcoming event, computed in the visitor's local time.
const countdown = document.querySelector<HTMLElement>('[data-countdown]');
if (countdown?.dataset.countdown) {
	const [year, month, day] = countdown.dataset.countdown.split('-').map(Number);
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const days = Math.round((new Date(year, month - 1, day).getTime() - today.getTime()) / 86_400_000);
	const staticView = countdown.querySelector<HTMLElement>('[data-static]');
	const liveView = countdown.querySelector<HTMLElement>('[data-live]');
	if (days >= 0 && staticView && liveView) {
		const label = liveView.querySelector('[data-count-label]');
		const num = liveView.querySelector('[data-count-num]');
		const unit = liveView.querySelector('[data-count-unit]');
		if (label && num && unit) {
			label.textContent = days === 0 ? 'es' : days === 1 ? 'falta' : 'faltan';
			num.textContent = days === 0 ? 'hoy' : String(days);
			unit.textContent = days === 0 ? '' : days === 1 ? 'día' : 'días';
			staticView.hidden = true;
			liveView.hidden = false;
		}
	}
}

// Filters: dim the entries that do not match; the rail stays intact. Entries without a type are never dimmed.
const filters = document.querySelector<HTMLElement>('[data-filters]');
const timeline = document.querySelector<HTMLElement>('[data-timeline]');
if (filters && timeline) {
	const buttons = Array.from(filters.querySelectorAll<HTMLButtonElement>('[data-filter]'));
	const status = filters.querySelector<HTMLElement>('[data-filter-status]');
	const typed = Array.from(timeline.querySelectorAll<HTMLElement>('[data-type]'));
	filters.addEventListener('click', (event) => {
		const button = (event.target as Element).closest<HTMLButtonElement>('[data-filter]');
		if (!button) return;
		const type = button.dataset.filter ?? 'all';
		buttons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
		let shown = 0;
		typed.forEach((item) => {
			const match = type === 'all' || item.dataset.type === type;
			item.classList.toggle('is-dim', !match);
			if (match) shown += 1;
		});
		if (status) status.textContent = type === 'all' ? '' : `${type}: ${shown} de ${typed.length}`;
	});
}

// Board cards: hover and keyboard focus are pure CSS; a tap toggles the "git show" panel on touch screens.
const members = Array.from(document.querySelectorAll<HTMLElement>('[data-member]'));
const touchOnly = window.matchMedia('(hover: none)');
members.forEach((member) => {
	member.addEventListener('click', () => {
		if (!touchOnly.matches) return;
		const open = !member.classList.contains('is-open');
		members.forEach((item) => item.classList.remove('is-open'));
		member.classList.toggle('is-open', open);
	});
	member.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') member.classList.remove('is-open');
	});
});

// Rail end: the main rail of the history graph stops exactly at the centre of the root node. The CSS mask under
// the root node is the fallback; with JS the rail itself is shortened so nothing is left below the root.
const history = document.querySelector<HTMLElement>('[data-history]');
const rootNode = history?.querySelector<HTMLElement>('[data-root-node]');
const mainRail = history?.querySelector<HTMLElement>(':scope > [data-rail]');
if (history && rootNode && mainRail) {
	const fitRail = () => {
		const graph = history.getBoundingClientRect();
		const node = rootNode.getBoundingClientRect();
		mainRail.style.bottom = `${Math.max(0, graph.bottom - (node.top + node.height / 2))}px`;
	};
	fitRail();
	window.addEventListener('load', fitRail);
	document.fonts?.ready.then(fitRail, () => {}); // A font that fails to load keeps the fallback; nothing to redo.
	new ResizeObserver(fitRail).observe(history);
}
