// Command logic of the FAQ prompt. Pure (no DOM) so it can be tested; `ui.ts` wires it to the page. A command resolves to
// one of a few outcomes (`resolve`), shown either as terminal lines (`runFaqCommand`) or as a manual page (`manualFor`).

export type FaqEntry = { topic: string; q: string; a: string };

// A free command managed from the admin: typed by its exact name, it prints `output` as is (it may span lines).
export type FaqCommandEntry = { name: string; description: string; output: string };

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
		didYouMeanCommand: (name: string) => ` ¿Quisiste decir '${name}'?`,
		typeHelp: " Escribe 'help' para ver los temas.",
		topicOf: 'tema de la ASO',
	},
	en: {
		help: 'Available topics. Type one or tap it in the list:',
		noTopic: (topic: string) => `git help: no topic named '${topic}'.`,
		notFound: (input: string) => `command not found: '${input}'.`,
		didYouMean: (topic: string) => ` Did you mean 'git help ${topic}'?`,
		didYouMeanCommand: (name: string) => ` Did you mean '${name}'?`,
		typeHelp: " Type 'help' to see the topics.",
		topicOf: 'ASO topic',
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

// The nearest FAQ topic or free command within the typo distance; the first of them wins a tie.
const closestName = (
	word: string,
	items: readonly FaqEntry[],
	commands: readonly FaqCommandEntry[],
): { name: string; free: boolean } | undefined => {
	let best: { name: string; free: boolean; score: number } | undefined;
	const candidates = [
		...items.map(({ topic }) => ({ name: topic, free: false })),
		...commands.map(({ name }) => ({ name, free: true })),
	];
	for (const candidate of candidates) {
		const score = distance(word, candidate.name);
		if (score <= MAX_TYPO_DISTANCE && (!best || score < best.score)) best = { ...candidate, score };
	}
	return best;
};

export const helpLines = (
	items: readonly FaqEntry[],
	locale: FaqLocale = 'es',
	commands: readonly FaqCommandEntry[] = [],
): FaqLine[] => [
	{ tone: 'out', text: MESSAGES[locale].help },
	...items.map((item) => ({ tone: 'topic' as const, text: `git help ${item.topic}`, note: item.q })),
	...commands.map((command) => ({ tone: 'topic' as const, text: command.name, note: command.description })),
];

type Resolved =
	| { kind: 'empty' }
	| { kind: 'clear' }
	| { kind: 'help' }
	| { kind: 'topic'; item: FaqEntry }
	| { kind: 'free'; entry: FaqCommandEntry }
	| { kind: 'unknown'; text: string };

// The one place that decides what a typed command means: clear, help, a topic (bare or `git help <topic>`), a free command
// or nothing known (with the message and the closest name as a hint).
const resolve = (
	input: string,
	items: readonly FaqEntry[],
	locale: FaqLocale,
	commands: readonly FaqCommandEntry[],
): Resolved => {
	const m = MESSAGES[locale];
	const command = normalize(input);
	if (command === '') return { kind: 'empty' };
	if (command === 'clear') return { kind: 'clear' };
	if (HELP_WORDS.has(command)) return { kind: 'help' };

	const asked = command.startsWith('git help ') ? command.slice('git help '.length) : command;
	const item = items.find((entry) => entry.topic === asked);
	if (item) return { kind: 'topic', item };

	const entry = commands.find((free) => free.name === command);
	if (entry) return { kind: 'free', entry };

	const suggestion = closestName(asked, items, commands);
	const head = command.startsWith('git help ') ? m.noTopic(asked) : m.notFound(input.trim());
	const hint = suggestion
		? suggestion.free
			? m.didYouMeanCommand(suggestion.name)
			: m.didYouMean(suggestion.name)
		: m.typeHelp;
	return { kind: 'unknown', text: head + hint };
};

export const runFaqCommand = (
	input: string,
	items: readonly FaqEntry[],
	locale: FaqLocale = 'es',
	commands: readonly FaqCommandEntry[] = [],
): FaqResult => {
	const result = resolve(input, items, locale, commands);
	switch (result.kind) {
		case 'empty':
			return { kind: 'lines', lines: [] };
		case 'clear':
			return { kind: 'clear' };
		case 'help':
			return { kind: 'lines', lines: helpLines(items, locale, commands) };
		case 'topic':
			return {
				kind: 'lines',
				lines: [
					{ tone: 'question', text: result.item.q },
					{ tone: 'answer', text: result.item.a },
				],
			};
		case 'free':
			return { kind: 'lines', lines: [{ tone: 'answer', text: result.entry.output }] };
		case 'unknown':
			return { kind: 'lines', lines: [{ tone: 'error', text: result.text }] };
	}
};

// A section of a manual page; the page layer decides the label of each kind ("Nombre", "Pregunta", ...).
export type ManualSection =
	| { kind: 'name' | 'question' | 'answer' | 'output' | 'error'; text: string }
	| { kind: 'topics'; rows: { command: string; note: string }[] };

// What the prompt shows for a command, as a manual page: a title like `GIT-HELP-COSTO(1)`, the command that is open (so the
// matching card can be marked) and the sections.
export type ManualPage = { title: string; current: string; sections: ManualSection[] };

export type ManualResult = { kind: 'none' } | { kind: 'clear' } | { kind: 'page'; page: ManualPage };

export const manualFor = (
	input: string,
	items: readonly FaqEntry[],
	locale: FaqLocale = 'es',
	commands: readonly FaqCommandEntry[] = [],
): ManualResult => {
	const result = resolve(input, items, locale, commands);
	switch (result.kind) {
		case 'empty':
			return { kind: 'none' };
		case 'clear':
			return { kind: 'clear' };
		case 'help':
			return {
				kind: 'page',
				page: {
					title: 'GIT-HELP(1)',
					current: '',
					sections: [
						{
							kind: 'topics',
							rows: [
								...items.map((item) => ({ command: `git help ${item.topic}`, note: item.q })),
								...commands.map((command) => ({ command: command.name, note: command.description })),
							],
						},
					],
				},
			};
		case 'topic':
			return {
				kind: 'page',
				page: {
					title: `GIT-HELP-${result.item.topic.toUpperCase()}(1)`,
					current: `git help ${result.item.topic}`,
					sections: [
						{ kind: 'name', text: `git help ${result.item.topic} — ${MESSAGES[locale].topicOf}` },
						{ kind: 'question', text: result.item.q },
						{ kind: 'answer', text: result.item.a },
					],
				},
			};
		case 'free':
			return {
				kind: 'page',
				page: {
					title: `${result.entry.name.toUpperCase()}(1)`,
					current: result.entry.name,
					sections: [
						{ kind: 'name', text: `${result.entry.name} — ${result.entry.description}` },
						{ kind: 'output', text: result.entry.output },
					],
				},
			};
		case 'unknown':
			return {
				kind: 'page',
				page: { title: 'ERROR', current: '', sections: [{ kind: 'error', text: result.text }] },
			};
	}
};

export const completeFaqCommand = (
	input: string,
	items: readonly FaqEntry[],
	commands: readonly FaqCommandEntry[] = [],
): string[] => {
	const prefix = input.replace(/^\s+/, '').replace(/\s+/g, ' ').toLowerCase();
	if (prefix === '') return [];
	// Every form runFaqCommand accepts: the help aliases, clear, bare topics, `git help <topic>` and the free commands.
	const candidates = [
		'help',
		'ayuda',
		'ls',
		'clear',
		...items.map((item) => item.topic),
		...commands.map((command) => command.name),
		...items.map((item) => `git help ${item.topic}`),
	];
	return candidates.filter((candidate) => candidate.startsWith(prefix) && candidate !== prefix);
};

// What Tab does, as in a shell: one match completes in place; several first extend the input to what they all share,
// and only list themselves once there is nothing more to extend. Null means no match, so Tab can leave the shell.
export const tabFaqCommand = (
	input: string,
	items: readonly FaqEntry[],
	commands: readonly FaqCommandEntry[] = [],
): { value: string; options: string[] } | null => {
	const matches = completeFaqCommand(input, items, commands);
	if (matches.length === 0) return null;
	if (matches.length === 1) return { value: matches[0], options: [] };
	let shared = matches[0];
	for (const match of matches) while (!match.startsWith(shared)) shared = shared.slice(0, -1);
	const typed = input.replace(/^\s+/, '').replace(/\s+/g, ' ').toLowerCase();
	return shared.length > typed.length ? { value: shared, options: [] } : { value: typed, options: matches };
};
