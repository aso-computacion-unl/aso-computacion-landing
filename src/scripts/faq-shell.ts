// Command logic of the FAQ terminal. Pure (no DOM) so it can be tested; `ui.ts` wires it to the page.

export type FaqEntry = { topic: string; q: string; a: string };

export type FaqLine = {
	tone: 'out' | 'topic' | 'question' | 'answer' | 'error';
	text: string;
	// Secondary column, used by help rows (the question next to its `git help <topic>`).
	note?: string;
};

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

export const helpLines = (items: readonly FaqEntry[]): FaqLine[] => [
	{ tone: 'out', text: 'Temas disponibles. Escribe uno o tócalo en la lista:' },
	...items.map((item) => ({ tone: 'topic' as const, text: `git help ${item.topic}`, note: item.q })),
];

export const runFaqCommand = (input: string, items: readonly FaqEntry[]): FaqResult => {
	const command = normalize(input);
	if (command === '') return { kind: 'lines', lines: [] };
	if (command === 'clear') return { kind: 'clear' };
	if (HELP_WORDS.has(command)) return { kind: 'lines', lines: helpLines(items) };

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
	const text = command.startsWith('git help ')
		? `git help: no hay ningún tema '${asked}'.${suggestion ? ` ¿Quisiste decir 'git help ${suggestion}'?` : " Escribe 'help' para ver los temas."}`
		: suggestion
			? `comando no encontrado: '${input.trim()}'. ¿Quisiste decir 'git help ${suggestion}'?`
			: `comando no encontrado: '${input.trim()}'. Escribe 'help' para ver los temas.`;
	return { kind: 'lines', lines: [{ tone: 'error', text }] };
};

export const completeFaqCommand = (input: string, items: readonly FaqEntry[]): string[] => {
	const prefix = input.replace(/^\s+/, '').replace(/\s+/g, ' ').toLowerCase();
	if (prefix === '') return [];
	// Every form runFaqCommand accepts: the help aliases, clear, bare topics and `git help <topic>`.
	const candidates = ['help', 'ayuda', 'ls', 'clear', ...items.map((item) => item.topic), ...items.map((item) => `git help ${item.topic}`)];
	return candidates.filter((candidate) => candidate.startsWith(prefix) && candidate !== prefix);
};
