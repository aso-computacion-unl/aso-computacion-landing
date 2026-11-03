import { toLocale } from '../i18n/locales';
import { typeLabel, useTranslations, type UiKey } from '../i18n/ui';
import {
	manualFor,
	tabFaqCommand,
	type FaqCommandEntry,
	type FaqEntry,
	type ManualPage,
	type ManualSection,
} from './faq-shell';
import './idle-motion';
import { initForumFeed } from './forum-feed';
import { initForumTabs } from './forum-tabs';
import { initNewsVisor } from './news-visor';

// The page's language (<html lang>, set by Layout.astro) decides the words these scripts write.
const locale = toLocale(document.documentElement.lang);
const t = useTranslations(locale);

// Small interactions that work with or without motion: activity filters, board cards on touch, forum tabs.
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

// Forum tabs: pick a category and the example threads filter to it (the bar stays hidden without JS, which shows them all).
const forum = document.querySelector<HTMLElement>('[data-forum]');
if (forum) initForumTabs(forum, t);

// The forum's example feed scrolls in line by line, except under reduced motion, where it keeps the lines it was drawn with.
const feed = document.querySelector<HTMLElement>('[data-forum-feed]');
if (feed && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) initForumFeed(feed);

// News terminal: the row under the pointer or focus shows its post in the pane beside it.
const newsVisor = document.querySelector<HTMLElement>('[data-news-visor]');
if (newsVisor) initNewsVisor(newsVisor);

// FAQ prompt: replaces the static <details> list with a big prompt (help, git help <tema>, clear, history, Tab), the
// answer as a manual page and a card per topic. The <details> entries stay the single source of questions and answers,
// and the fallback without JS.
const faqSection = document.querySelector<HTMLElement>('[data-faq]');
const faqStatic = faqSection?.querySelector<HTMLElement>('[data-faq-static]');
const faqTerm = faqSection?.querySelector<HTMLElement>('[data-faq-term]');
const faqMan = faqSection?.querySelector<HTMLElement>('[data-faq-man]');
const faqForm = faqSection?.querySelector<HTMLFormElement>('[data-faq-form]');
const faqInput = faqSection?.querySelector<HTMLInputElement>('[data-faq-input]');
const faqEntries: FaqEntry[] = Array.from(faqSection?.querySelectorAll<HTMLElement>('[data-faq-entry]') ?? []).map(
	(entry) => ({
		topic: entry.dataset.topic ?? '',
		q: entry.querySelector('[data-faq-q]')?.textContent?.trim() ?? '',
		a: entry.querySelector('[data-faq-a]')?.textContent?.trim() ?? '',
	}),
);
// Free commands exist only as cards, carrying their description and output.
const faqCommands: FaqCommandEntry[] = Array.from(
	faqSection?.querySelectorAll<HTMLElement>('[data-faq-command]') ?? [],
).map((card) => ({
	name: card.dataset.faqRun ?? '',
	description: card.dataset.description ?? '',
	output: card.dataset.output ?? '',
}));
if (faqStatic && faqTerm && faqMan && faqForm && faqInput && (faqEntries.length > 0 || faqCommands.length > 0)) {
	const MAX_HISTORY = 50;
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
	const cards = Array.from(faqTerm.querySelectorAll<HTMLButtonElement>('.faq-card'));
	const typed: string[] = [];
	let historyIndex: number | null = null;
	let draft = '';

	const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) => {
		const element = document.createElement(tag);
		element.className = className;
		if (text !== undefined) element.textContent = text;
		return element;
	};

	const runButton = (command: string, className: string, text = command): HTMLButtonElement => {
		const button = el('button', className, text);
		button.type = 'button';
		button.dataset.faqRun = command;
		return button;
	};

	const labels: Record<ManualSection['kind'], UiKey> = {
		name: 'faq.man.name',
		question: 'faq.man.question',
		answer: 'faq.man.answer',
		output: 'faq.man.output',
		error: 'faq.man.error',
		topics: 'faq.man.topics',
	};

	// One term/definition pair of the page. Every value goes in through textContent: questions and answers come from the admin.
	const section = (item: ManualSection): [HTMLElement, HTMLElement] => {
		const value = el('dd', '');
		if (item.kind === 'topics') {
			const list = el('div', 'faq-man-topics');
			for (const row of item.rows) {
				const button = runButton(row.command, 'faq-man-topic');
				button.replaceChildren(el('span', 'faq-man-cmd', row.command), el('span', 'faq-man-note', row.note));
				list.append(button);
			}
			value.append(list);
		} else {
			value.append(el(item.kind === 'output' ? 'pre' : 'p', `faq-man-${item.kind}`, item.text));
		}
		return [el('dt', '', t(labels[item.kind])), value];
	};

	const showPage = (page: ManualPage) => {
		const top = el('div', 'faq-man-top');
		const clear = runButton('clear', 'faq-man-clear');
		clear.setAttribute('aria-label', t('faq.man.clear'));
		top.append(el('span', '', page.title), clear);
		const list = el('dl', 'faq-man-sections');
		for (const item of page.sections) list.append(...section(item));
		faqMan.replaceChildren(top, list);
		faqMan.hidden = false;
		cards.forEach((card) => card.toggleAttribute('aria-current', card.dataset.faqRun === page.current));
	};

	const clearPage = () => {
		faqMan.replaceChildren();
		faqMan.hidden = true;
		cards.forEach((card) => card.removeAttribute('aria-current'));
	};

	const run = (command: string) => {
		const result = manualFor(command, faqEntries, locale, faqCommands);
		if (result.kind === 'none') return;
		if (command.trim() !== '') {
			typed.push(command.trim());
			if (typed.length > MAX_HISTORY) typed.shift();
		}
		historyIndex = null;
		faqInput.value = '';
		if (result.kind === 'clear') clearPage();
		else showPage(result.page);
	};

	// A tap on a card can leave the page below the fold on narrow screens: bring it into view.
	const reveal = () => {
		const box = faqMan.getBoundingClientRect();
		if (faqMan.hidden || (box.top >= 0 && box.bottom <= window.innerHeight)) return;
		faqMan.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
	};

	faqTerm.addEventListener('click', (event) => {
		const button = (event.target as Element).closest<HTMLButtonElement>('[data-faq-run]');
		if (!button?.dataset.faqRun) return;
		run(button.dataset.faqRun);
		if (button.closest('.faq-cards')) reveal();
	});

	faqForm.addEventListener('submit', (event) => {
		event.preventDefault();
		run(faqInput.value);
	});

	faqInput.addEventListener('keydown', (event) => {
		if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
			if (typed.length === 0) return;
			event.preventDefault();
			if (event.key === 'ArrowUp') {
				if (historyIndex === null) {
					draft = faqInput.value;
					historyIndex = typed.length - 1;
				} else historyIndex = Math.max(0, historyIndex - 1);
				faqInput.value = typed[historyIndex];
			} else if (historyIndex !== null) {
				historyIndex += 1;
				if (historyIndex >= typed.length) {
					historyIndex = null;
					faqInput.value = draft;
				} else faqInput.value = typed[historyIndex];
			}
			return;
		}
		if (event.key === 'Tab') {
			// Only take Tab when there is something to complete, so keyboard users can still tab out of the prompt.
			const tab = tabFaqCommand(faqInput.value, faqEntries, faqCommands);
			if (!tab) return;
			event.preventDefault();
			faqInput.value = tab.value;
			if (tab.options.length > 0)
				showPage({
					title: 'TAB',
					current: '',
					sections: [{ kind: 'topics', rows: tab.options.map((option) => ({ command: option, note: '' })) }],
				});
		}
	});

	// Opens on the first topic (or the list, when there are only free commands), as the user would after typing it.
	const first = faqEntries[0] ? `git help ${faqEntries[0].topic}` : 'help';
	const opening = manualFor(first, faqEntries, locale, faqCommands);
	if (opening.kind === 'page') showPage(opening.page);
	faqStatic.hidden = true;
	faqTerm.hidden = false;
}

// The three moments from the degree (networks, languages, hacking) load only on a page that has one.
if (document.querySelector('[data-net], [data-lang], [data-decrypt]')) void import('./moments');
