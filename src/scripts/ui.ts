import { toLocale } from '../i18n/locales';
import { typeLabel, useTranslations } from '../i18n/ui';
import './idle-motion';

// The page's language (<html lang>, set by Layout.astro) decides the words these scripts write.
const locale = toLocale(document.documentElement.lang);
const t = useTranslations(locale);

// Small interactions that work with or without motion: activity filters and board cards on touch.
// Every one of them has a complete static fallback in the HTML.

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
			// A match in the folded history opens it, so a filter never points at something that cannot be seen.
			if (match && type !== 'all') item.closest('details')?.setAttribute('open', '');
		});
		if (status)
			status.textContent =
				type === 'all' ? '' : t('filters.status', { type: typeLabel(locale, type), shown, total: typed.length });
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

// The folded history opens and closes, which moves everything below it: the scroll animations measure again.
history
	?.querySelector('[data-history-more]')
	?.addEventListener('toggle', () => window.dispatchEvent(new Event('aso:relayout')));

// The moment from the degree (hacking) loads only on a page that has one.
if (document.querySelector('[data-decrypt]')) void import('./moments');
