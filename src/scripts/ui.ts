import { toLocale } from '../i18n/locales';
import { typeLabel, useTranslations } from '../i18n/ui';
import { completeFaqCommand, helpLines, runFaqCommand, type FaqEntry, type FaqLine } from './faq-shell';

// The page's language (<html lang>, set by Layout.astro) decides the words these scripts write.
const locale = toLocale(document.documentElement.lang);
const t = useTranslations(locale);

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
			label.textContent = days === 0 ? t('count.is') : days === 1 ? t('count.one') : t('count.many');
			num.textContent = days === 0 ? t('count.today') : String(days);
			unit.textContent = days === 0 ? '' : days === 1 ? t('count.dayOne') : t('count.dayMany');
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
		if (status) status.textContent = type === 'all' ? '' : t('filters.status', { type: typeLabel(locale, type), shown, total: typed.length });
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
	document.fonts?.ready.then(fitRail);
	new ResizeObserver(fitRail).observe(history);
}

// FAQ terminal: replaces the static <details> list with a small shell (help, git help <tema>, clear, history, Tab).
// The <details> entries stay the single source of questions and answers, and the fallback without JS.
const faqSection = document.querySelector<HTMLElement>('[data-faq]');
const faqStatic = faqSection?.querySelector<HTMLElement>('[data-faq-static]');
const faqTerm = faqSection?.querySelector<HTMLElement>('[data-faq-term]');
const faqShell = faqSection?.querySelector<HTMLElement>('[data-faq-shell]');
const faqOut = faqSection?.querySelector<HTMLElement>('[data-faq-out]');
const faqForm = faqSection?.querySelector<HTMLFormElement>('[data-faq-form]');
const faqInput = faqSection?.querySelector<HTMLInputElement>('[data-faq-input]');
const faqEntries: FaqEntry[] = Array.from(faqSection?.querySelectorAll<HTMLElement>('[data-faq-entry]') ?? []).map((entry) => ({
	topic: entry.dataset.topic ?? '',
	q: entry.querySelector('[data-faq-q]')?.textContent?.trim() ?? '',
	a: entry.querySelector('[data-faq-a]')?.textContent?.trim() ?? '',
}));
if (faqStatic && faqTerm && faqShell && faqOut && faqForm && faqInput && faqEntries.length > 0) {
	const MAX_LINES = 120;
	const MAX_HISTORY = 50;
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
	const guideRows = Array.from(faqTerm.querySelectorAll<HTMLButtonElement>('.faq-guide-row'));
	const typed: string[] = [];
	let historyIndex: number | null = null;
	let draft = '';

	const line = (className: string, text = ''): HTMLDivElement => {
		const element = document.createElement('div');
		element.className = `term-line ${className}`;
		element.textContent = text;
		return element;
	};

	// Every value goes in through textContent: questions and answers come from the admin.
	const render = (item: FaqLine): HTMLElement => {
		if (item.tone !== 'topic') return line(`is-${item.tone}`, item.text);
		const row = line('is-topic');
		const run = document.createElement('button');
		run.type = 'button';
		run.className = 'term-run';
		run.dataset.faqRun = item.text;
		run.textContent = item.text;
		const note = document.createElement('span');
		note.className = 'term-note';
		note.textContent = item.note ?? '';
		row.append(run, note);
		return row;
	};

	const echo = (command: string): HTMLElement => {
		const row = line('is-in');
		const sign = document.createElement('span');
		sign.className = 'term-sign';
		sign.textContent = 'aso@unl:~$';
		row.append(sign, document.createTextNode(` ${command}`));
		return row;
	};

	const append = (nodes: HTMLElement[]) => {
		faqOut.append(...nodes);
		while (faqOut.childElementCount > MAX_LINES) faqOut.firstElementChild?.remove();
		faqOut.scrollTop = faqOut.scrollHeight;
	};

	const markCurrent = (command: string) => {
		guideRows.forEach((row) => row.toggleAttribute('aria-current', row.dataset.faqRun === command.trim().toLowerCase()));
	};

	const run = (command: string) => {
		const result = runFaqCommand(command, faqEntries, locale);
		if (command.trim() !== '') {
			typed.push(command.trim());
			if (typed.length > MAX_HISTORY) typed.shift();
		}
		historyIndex = null;
		faqInput.value = '';
		markCurrent(command);
		if (result.kind === 'clear') {
			faqOut.replaceChildren();
			return;
		}
		append([echo(command.trim()), ...result.lines.map(render)]);
	};

	// The shell may sit below the guide on narrow screens: bring the answer into view after a tap.
	const reveal = () => {
		const box = faqShell.getBoundingClientRect();
		if (box.top >= 0 && box.bottom <= window.innerHeight) return;
		faqShell.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
	};

	faqTerm.addEventListener('click', (event) => {
		const button = (event.target as Element).closest<HTMLButtonElement>('[data-faq-run]');
		if (!button?.dataset.faqRun) return;
		run(button.dataset.faqRun);
		reveal();
	});

	faqOut.addEventListener('click', (event) => {
		if ((event.target as Element).closest('button') || window.getSelection()?.toString()) return;
		faqInput.focus({ preventScroll: true });
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
			// Only take Tab when there is something to complete, so keyboard users can still tab out of the shell.
			const matches = completeFaqCommand(faqInput.value, faqEntries);
			if (matches.length === 0) return;
			event.preventDefault();
			if (matches.length === 1) faqInput.value = matches[0];
			else append([line('is-out', matches.join('   '))]);
		}
	});

	append([echo('help'), ...helpLines(faqEntries, locale).map(render)]);
	faqStatic.hidden = true;
	faqTerm.hidden = false;
}
