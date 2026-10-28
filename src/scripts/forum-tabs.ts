// Category tabs of the forum section: pick a category and the example threads filter to it. The rules are pure (no DOM)
// so they can be tested; `initForumTabs` wires them to the markup of components/Forum.astro. Without JS the tab bar stays
// hidden and every thread shows.
import type { Translate } from '../i18n/ui';

// The tab that shows every thread.
export const ALL = 'all';

export const matchesCategory = (category: string, selected: string): boolean =>
	selected === ALL || category === selected;

// How many threads a tab would show.
export const countThreads = (categories: readonly string[], selected: string): number =>
	categories.filter((category) => matchesCategory(category, selected)).length;

// Where an arrow, Home or End key moves the focus among `count` tabs (the ends wrap); null for any other key.
export function nextTabIndex(key: string, current: number, count: number): number | null {
	if (count <= 0) return null;
	switch (key) {
		case 'ArrowRight':
		case 'ArrowDown':
			return (current + 1) % count;
		case 'ArrowLeft':
		case 'ArrowUp':
			return (current - 1 + count) % count;
		case 'Home':
			return 0;
		case 'End':
			return count - 1;
		default:
			return null;
	}
}

// Sets up the tabs inside `root` (the `[data-forum]` block). Does nothing when a piece of the markup is missing.
export function initForumTabs(root: HTMLElement, t: Translate): void {
	const tablist = root.querySelector<HTMLElement>('[data-forum-tabs]');
	const panel = root.querySelector<HTMLElement>('[data-forum-panel]');
	const status = root.querySelector<HTMLElement>('[data-forum-status]');
	const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-forum-tab]'));
	const threads = Array.from(root.querySelectorAll<HTMLElement>('[data-forum-thread]'));
	if (!tablist || !panel || !status || tabs.length === 0) return;

	const categories = threads.map((thread) => thread.dataset.category ?? '');

	const select = (tab: HTMLButtonElement) => {
		const selected = tab.dataset.category ?? ALL;
		tabs.forEach((item) => {
			const on = item === tab;
			item.setAttribute('aria-selected', String(on));
			item.tabIndex = on ? 0 : -1;
		});
		threads.forEach((thread) => {
			thread.hidden = !matchesCategory(thread.dataset.category ?? '', selected);
		});
		panel.setAttribute('aria-labelledby', tab.id);
		const shown = countThreads(categories, selected);
		const count = t(shown === 1 ? 'forum.count.one' : 'forum.count.many', { count: shown });
		status.textContent = `${tab.dataset.description ?? ''} · ${count}`;
	};

	tablist.addEventListener('click', (event) => {
		const tab = (event.target as Element).closest<HTMLButtonElement>('[data-forum-tab]');
		if (tab) select(tab);
	});

	tablist.addEventListener('keydown', (event) => {
		const current = tabs.findIndex((tab) => tab === document.activeElement);
		if (current < 0) return;
		const next = nextTabIndex(event.key, current, tabs.length);
		if (next === null) return;
		event.preventDefault();
		tabs[next].focus();
		select(tabs[next]);
	});

	panel.setAttribute('role', 'tabpanel');
	tablist.hidden = false;
	select(tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') ?? tabs[0]);
}
