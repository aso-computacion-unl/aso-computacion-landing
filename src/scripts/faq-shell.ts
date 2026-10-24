// Command logic of the FAQ terminal. Pure (no DOM) so it can be tested; `ui.ts` wires it to the page.

export type FaqEntry = { topic: string; q: string; a: string };

export type FaqLine = {
	tone: 'out' | 'topic' | 'question' | 'answer' | 'error';
	text: string;
	// Secondary column, used by help rows (the question next to its `git help <topic>`).
	note?: string;
};

// Messages of the terminal itself; questions and answers come from the admin as written.
const MESSAGES = {
	es: {
		help: 'Temas disponibles. Escribe uno o tócalo en la lista:',
		noTopic: (topic: string) => `git help: no hay ningún tema '${topic}'.`,
		notFound: (input: string) => `comando no encontrado: '${input}'.`,
		didYouMean: (topic: string) => ` ¿Quisiste decir 'git help ${topic}'?`,
		typeHelp: " Escribe 'help' para ver los temas.",
	},
	en: {
		help: 'Available topics. Type one or tap it in the list:',
		noTopic: (topic: string) => `git help: no topic named '${topic}'.`,
		notFound: (input: string) => `command not found: '${input}'.`,
		didYouMean: (topic: string) => ` Did you mean 'git help ${topic}'?`,
		typeHelp: " Type 'help' to see the topics.",
	},
};

export type FaqLocale = keyof typeof MESSAGES;

export type FaqResult = { kind: 'clear' } | { kind: 'lines'; lines: FaqLine[] };

const HELP_WORDS = new Set(['help', 'git help', 'ayuda', 'ls']);
const MAX_TYPO_DISTANCE = 2;

const normalize = (input: string): string => input.trim().replace(/\s+/g, ' ').toLowerCase();

const distance = (a: string, b: string): number => {
	const row = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i += 1) {
		let previous = row[0];
		row[0] = i;
		for (let j = 1; j <= b.length; j += 1) {
			const current = row[j];
			row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
			previous = current;
		}
	}
	return row[b.length];
};

const closestTopic = (word: string, items: readonly FaqEntry[]): string | undefined => {
	let best: { topic: string; score: number } | undefined;
	for (const { topic } of items) {
		const score = distance(word, topic);
		if (score <= MAX_TYPO_DISTANCE && (!best || score < best.score)) best = { topic, score };
	}
	return best?.topic;
};

export const helpLines = (items: readonly FaqEntry[], locale: FaqLocale = 'es'): FaqLine[] => [
	{ tone: 'out', text: MESSAGES[locale].help },
	...items.map((item) => ({ tone: 'topic' as const, text: `git help ${item.topic}`, note: item.q })),
];

export const runFaqCommand = (input: string, items: readonly FaqEntry[], locale: FaqLocale = 'es'): FaqResult => {
	const m = MESSAGES[locale];
	const command = normalize(input);
	if (command === '') return { kind: 'lines', lines: [] };
	if (command === 'clear') return { kind: 'clear' };
	if (HELP_WORDS.has(command)) return { kind: 'lines', lines: helpLines(items, locale) };

	const asked = command.startsWith('git help ') ? command.slice('git help '.length) : command;
	const item = items.find((entry) => entry.topic === asked);
	if (item) {
		return {
			kind: 'lines',
			lines: [
				{ tone: 'question', text: item.q },
				{ tone: 'answer', text: item.a },
			],
		};
	}

	const suggestion = closestTopic(asked, items);
	const head = command.startsWith('git help ') ? m.noTopic(asked) : m.notFound(input.trim());
	const text = head + (suggestion ? m.didYouMean(suggestion) : m.typeHelp);
	return { kind: 'lines', lines: [{ tone: 'error', text }] };
};

export const completeFaqCommand = (input: string, items: readonly FaqEntry[]): string[] => {
	const prefix = input.replace(/^\s+/, '').replace(/\s+/g, ' ').toLowerCase();
	if (prefix === '') return [];
	// Every form runFaqCommand accepts: the help aliases, clear, bare topics and `git help <topic>`.
	const candidates = ['help', 'ayuda', 'ls', 'clear', ...items.map((item) => item.topic), ...items.map((item) => `git help ${item.topic}`)];
	return candidates.filter((candidate) => candidate.startsWith(prefix) && candidate !== prefix);
};

// What Tab does, as in a shell: one match completes in place; several first extend the input to what they all share,
// and only list themselves once there is nothing more to extend. Null means no match, so Tab can leave the shell.
export const tabFaqCommand = (input: string, items: readonly FaqEntry[]): { value: string; options: string[] } | null => {
	const matches = completeFaqCommand(input, items);
	if (matches.length === 0) return null;
	if (matches.length === 1) return { value: matches[0], options: [] };
	let shared = matches[0];
	for (const match of matches) while (!match.startsWith(shared)) shared = shared.slice(0, -1);
	const typed = input.replace(/^\s+/, '').replace(/\s+/g, ' ').toLowerCase();
	return shared.length > typed.length ? { value: shared, options: [] } : { value: typed, options: matches };
};
