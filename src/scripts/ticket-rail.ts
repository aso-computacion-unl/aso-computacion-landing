import { toLocale } from '../i18n/locales';
import { useTranslations } from '../i18n/ui';

// The Inscripciones rail (S5): with more than three tickets the list scrolls sideways instead of growing rows. The
// server already marks the list (`is-rail`), so without this script it is a plain scrollable strip; this adds the
// arrows, the "01–03 de 06" counter and the progress bar. Loaded only when a rail is on the page.

// Up to three tickets stay the grid.
export const RAIL_MIN = 4;
export const shouldRail = (count: number): boolean => count >= RAIL_MIN;

export const padCount = (n: number): string => String(n).padStart(2, '0');

export interface RailMeasure {
	count: number;
	// Distance from one ticket's left edge to the next one's (width plus gap).
	step: number;
	scrollLeft: number;
	clientWidth: number;
	scrollWidth: number;
}

export interface RailState {
	from: number;
	to: number;
	total: number;
	// 0..1, how much of the strip has been shown so far.
	progress: number;
	atStart: boolean;
	atEnd: boolean;
}

// A few pixels of slack: browsers land a snapped scroll on fractions of a pixel.
const EDGE = 4;

export function railState({ count, step, scrollLeft, clientWidth, scrollWidth }: RailMeasure): RailState {
	const size = step > 0 ? step : 1;
	const perPage = step > 0 ? Math.max(1, Math.round(clientWidth / size)) : 1;
	const first = Math.min(count - 1, Math.max(0, Math.round(scrollLeft / size)));
	const to = Math.min(count, first + perPage);
	return {
		from: first + 1,
		to,
		total: count,
		progress: count > 0 ? to / count : 1,
		atStart: scrollLeft < EDGE,
		atEnd: scrollLeft + clientWidth >= scrollWidth - EDGE,
	};
}

export function initRail(host: HTMLElement) {
	const list = host.querySelector<HTMLElement>('[data-rail]');
	const ui = host.querySelector<HTMLElement>('[data-rail-ui]');
	if (!list || !ui) return;
	// Not `children`: Astro leaves the ticket's own <script> inside the list, after the first item.
	const items = Array.from(list.querySelectorAll<HTMLElement>(':scope > .tk-item'));
	if (!shouldRail(items.length)) return;

	const t = useTranslations(toLocale(document.documentElement.lang));
	const prev = ui.querySelector<HTMLButtonElement>('[data-rail-prev]');
	const next = ui.querySelector<HTMLButtonElement>('[data-rail-next]');
	const count = ui.querySelector<HTMLElement>('[data-rail-count]');
	const bar = ui.querySelector<HTMLElement>('[data-rail-bar]');
	const reduced = matchMedia('(prefers-reduced-motion: reduce)');

	const step = () =>
		items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : (items[0]?.getBoundingClientRect().width ?? 0);

	const paint = () => {
		const state = railState({
			count: items.length,
			step: step(),
			scrollLeft: list.scrollLeft,
			clientWidth: list.clientWidth,
			scrollWidth: list.scrollWidth,
		});
		if (count)
			count.textContent = t('ticket.rail.range', {
				from: padCount(state.from),
				to: padCount(state.to),
				total: padCount(state.total),
			});
		bar?.style.setProperty('transform', `scaleX(${state.progress})`);
		if (prev) prev.disabled = state.atStart;
		if (next) next.disabled = state.atEnd;
	};

	const go = (direction: 1 | -1) =>
		list.scrollBy({ left: direction * step(), behavior: reduced.matches ? 'auto' : 'smooth' });
	prev?.addEventListener('click', () => go(-1));
	next?.addEventListener('click', () => go(1));

	let frame = 0;
	const schedule = () => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(paint);
	};
	list.addEventListener('scroll', schedule, { passive: true });
	new ResizeObserver(schedule).observe(list);

	ui.hidden = false;
	paint();
}

const host = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('[data-rail-host]');
if (host) initRail(host);
