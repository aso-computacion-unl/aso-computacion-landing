import { describe, expect, it } from 'vitest';
import {
	completeFaqCommand,
	helpLines,
	manualFor,
	runFaqCommand,
	tabFaqCommand,
	type FaqCommandEntry,
	type FaqEntry,
} from './faq-shell';

const items: FaqEntry[] = [
	{ topic: 'participar', q: '¿Quién puede participar?', a: 'Cualquier estudiante.' },
	{ topic: 'costo', q: '¿Tiene algún costo?', a: 'Es gratis.' },
	{ topic: 'contacto', q: '¿Cómo contacto a la directiva?', a: 'Por mensaje directo.' },
];

describe('runFaqCommand', () => {
	it('lists every topic with its question on help', () => {
		const result = runFaqCommand('help', items);
		expect(result.kind).toBe('lines');
		if (result.kind !== 'lines') return;
		const text = result.lines.map((line) => `${line.text} ${line.note ?? ''}`).join('\n');
		for (const item of items) {
			expect(text).toContain(`git help ${item.topic}`);
			expect(text).toContain(item.q);
		}
	});

	it('treats a bare "git help" and "ayuda" like help', () => {
		expect(runFaqCommand('git help', items)).toEqual(runFaqCommand('help', items));
		expect(runFaqCommand('ayuda', items)).toEqual(runFaqCommand('help', items));
	});

	it('answers "git help <topic>" with the question and the answer', () => {
		expect(runFaqCommand('git help costo', items)).toEqual({
			kind: 'lines',
			lines: [
				{ tone: 'question', text: '¿Tiene algún costo?' },
				{ tone: 'answer', text: 'Es gratis.' },
			],
		});
	});

	it('accepts the bare topic, any case and extra spaces', () => {
		expect(runFaqCommand('  COSTO ', items)).toEqual(runFaqCommand('git help costo', items));
		expect(runFaqCommand('git   help   Costo', items)).toEqual(runFaqCommand('git help costo', items));
	});

	it('suggests the closest topic for a typo', () => {
		expect(runFaqCommand('git help cotso', items)).toEqual({
			kind: 'lines',
			lines: [{ tone: 'error', text: "git help: no hay ningún tema 'cotso'. ¿Quisiste decir 'git help costo'?" }],
		});
	});

	it('points to help when nothing is close', () => {
		expect(runFaqCommand('rm -rf /', items)).toEqual({
			kind: 'lines',
			lines: [{ tone: 'error', text: "comando no encontrado: 'rm -rf /'. Escribe 'help' para ver los temas." }],
		});
	});

	it('clears the screen', () => {
		expect(runFaqCommand('clear', items)).toEqual({ kind: 'clear' });
	});

	it('prints nothing for an empty line', () => {
		expect(runFaqCommand('   ', items)).toEqual({ kind: 'lines', lines: [] });
	});
});

describe('completeFaqCommand', () => {
	it('completes a unique topic prefix', () => {
		expect(completeFaqCommand('git help pa', items)).toEqual(['git help participar']);
		expect(completeFaqCommand('cl', items)).toEqual(['clear']);
	});

	it('completes bare topics and the help aliases, the forms runFaqCommand accepts', () => {
		expect(completeFaqCommand('cos', items)).toEqual(['costo']);
		expect(completeFaqCommand('ay', items)).toEqual(['ayuda']);
		expect(completeFaqCommand('l', items)).toEqual(['ls']);
		expect(completeFaqCommand('c', items)).toEqual(['clear', 'costo', 'contacto']);
	});

	it('returns every candidate for an ambiguous prefix', () => {
		expect(completeFaqCommand('git help co', items)).toEqual(['git help costo', 'git help contacto']);
	});

	it('returns nothing for an empty or unmatched input', () => {
		expect(completeFaqCommand('', items)).toEqual([]);
		expect(completeFaqCommand('zzz', items)).toEqual([]);
	});
});

describe('tabFaqCommand', () => {
	it('lets Tab through when nothing matches', () => {
		expect(tabFaqCommand('', items)).toBeNull();
		expect(tabFaqCommand('zzz', items)).toBeNull();
	});

	it('completes a single match in place', () => {
		expect(tabFaqCommand('git help pa', items)).toEqual({ value: 'git help participar', options: [] });
	});

	it('extends an ambiguous prefix to what every match shares before listing them', () => {
		expect(tabFaqCommand('git h', items)).toEqual({ value: 'git help ', options: [] });
		expect(tabFaqCommand('co', items)).toEqual({ value: 'co', options: ['costo', 'contacto'] });
		expect(tabFaqCommand('git help co', items)).toEqual({
			value: 'git help co',
			options: ['git help costo', 'git help contacto'],
		});
	});

	it('keeps what was typed when the matches share nothing more', () => {
		expect(tabFaqCommand('c', items)).toEqual({ value: 'c', options: ['clear', 'costo', 'contacto'] });
	});

	it('works from untidy input', () => {
		expect(tabFaqCommand('  GIT   help pa', items)).toEqual({ value: 'git help participar', options: [] });
	});
});

describe('FAQ terminal in English', () => {
	const items = [{ topic: 'costo', q: 'Does it cost anything?', a: 'No.' }];

	it('introduces the help list in English', () => {
		expect(helpLines(items, 'en')[0]).toEqual({
			tone: 'out',
			text: 'Available topics. Type one or tap it in the list:',
		});
	});

	it('explains unknown commands and topics in English', () => {
		const error = (input: string) => {
			const result = runFaqCommand(input, items, 'en');
			return result.kind === 'lines' ? result.lines[0]?.text : undefined;
		};
		expect(error('git help cosot')).toBe("git help: no topic named 'cosot'. Did you mean 'git help costo'?");
		expect(error('git help zzz')).toBe("git help: no topic named 'zzz'. Type 'help' to see the topics.");
		expect(error('cosot')).toBe("command not found: 'cosot'. Did you mean 'git help costo'?");
		expect(error('zzz')).toBe("command not found: 'zzz'. Type 'help' to see the topics.");
	});

	it('keeps Spanish as the default', () => {
		expect(helpLines(items)[0]?.text).toBe('Temas disponibles. Escribe uno o tócalo en la lista:');
	});
});

describe('FAQ terminal: free commands', () => {
	const commands: FaqCommandEntry[] = [
		{ name: 'whoami', description: 'Quiénes somos', output: 'Somos la ASO.\nTe esperamos.' },
		{ name: 'horario', description: 'Cuándo atendemos', output: 'Lunes a viernes.' },
	];
	const run = (input: string, locale: 'es' | 'en' = 'es') => runFaqCommand(input, items, locale, commands);

	it('runs a free command by its exact name and prints its multi-line output', () => {
		expect(run('whoami')).toEqual({ kind: 'lines', lines: [{ tone: 'answer', text: 'Somos la ASO.\nTe esperamos.' }] });
	});

	it('normalizes the name like any other command', () => {
		expect(run('  WhoAmI ')).toEqual(run('whoami'));
	});

	it('does not run a free command through "git help"', () => {
		const result = run('git help whoami');
		expect(result.kind === 'lines' && result.lines[0]?.tone).toBe('error');
	});

	it('lists the free commands in help after the FAQ topics, with their description', () => {
		const lines = helpLines(items, 'es', commands);
		expect(lines.slice(1).map((line) => line.text)).toEqual([
			'git help participar',
			'git help costo',
			'git help contacto',
			'whoami',
			'horario',
		]);
		expect(lines[4]).toEqual({ tone: 'topic', text: 'whoami', note: 'Quiénes somos' });
		expect(run('help')).toEqual({ kind: 'lines', lines });
	});

	it('suggests a free command for a typo, without the "git help" prefix', () => {
		const text = (result: ReturnType<typeof run>) => (result.kind === 'lines' ? result.lines[0]?.text : undefined);
		expect(text(run('whoai'))).toBe("comando no encontrado: 'whoai'. ¿Quisiste decir 'whoami'?");
		expect(text(run('horaro', 'en'))).toBe("command not found: 'horaro'. Did you mean 'horario'?");
	});

	it('still suggests a FAQ topic when that one is closer', () => {
		const result = run('cotso');
		expect(result.kind === 'lines' && result.lines[0]?.text).toContain("'git help costo'");
	});

	it('completes free command names', () => {
		expect(completeFaqCommand('who', items, commands)).toEqual(['whoami']);
		expect(tabFaqCommand('ho', items, commands)).toEqual({ value: 'horario', options: [] });
	});

	it('behaves as before when there are no free commands', () => {
		expect(runFaqCommand('whoami', items)).toEqual(runFaqCommand('whoami', items, 'es', []));
		expect(helpLines(items)).toHaveLength(items.length + 1);
	});
});

describe('manualFor: the answer as a manual page', () => {
	const commands: FaqCommandEntry[] = [
		{ name: 'whoami', description: 'Quiénes somos', output: 'Somos la ASO.\nTe esperamos.' },
	];
	const page = (input: string, locale: 'es' | 'en' = 'es') => {
		const result = manualFor(input, items, locale, commands);
		if (result.kind !== 'page') throw new Error(`expected a page, got ${result.kind}`);
		return result.page;
	};

	it('opens a topic as name, question and answer, titled like a man page', () => {
		expect(page('git help costo')).toEqual({
			title: 'GIT-HELP-COSTO(1)',
			current: 'git help costo',
			sections: [
				{ kind: 'name', text: 'git help costo — tema de la ASO' },
				{ kind: 'question', text: '¿Tiene algún costo?' },
				{ kind: 'answer', text: 'Es gratis.' },
			],
		});
	});

	it('accepts the same forms as the terminal: bare topic, any case, extra spaces', () => {
		expect(page('  COSTO ')).toEqual(page('git help costo'));
		expect(page('git   help   Costo')).toEqual(page('git help costo'));
	});

	it('words the name line in the page language', () => {
		expect(page('costo', 'en').sections[0]).toEqual({ kind: 'name', text: 'git help costo — ASO topic' });
	});

	it('prints a free command as its name and its output, and marks it as the open one', () => {
		expect(page('whoami')).toEqual({
			title: 'WHOAMI(1)',
			current: 'whoami',
			sections: [
				{ kind: 'name', text: 'whoami — Quiénes somos' },
				{ kind: 'output', text: 'Somos la ASO.\nTe esperamos.' },
			],
		});
	});

	it('lists every topic, then every free command, on help and its aliases', () => {
		const help = page('help');
		expect(help.current).toBe('');
		expect(help.sections).toEqual([
			{
				kind: 'topics',
				rows: [
					{ command: 'git help participar', note: '¿Quién puede participar?' },
					{ command: 'git help costo', note: '¿Tiene algún costo?' },
					{ command: 'git help contacto', note: '¿Cómo contacto a la directiva?' },
					{ command: 'whoami', note: 'Quiénes somos' },
				],
			},
		]);
		expect(page('ayuda')).toEqual(help);
		expect(page('ls')).toEqual(help);
	});

	it('explains an unknown command with the terminal message and a suggestion', () => {
		expect(page('cotso').sections).toEqual([
			{ kind: 'error', text: "comando no encontrado: 'cotso'. ¿Quisiste decir 'git help costo'?" },
		]);
		expect(page('rm -rf /').title).toBe('ERROR');
	});

	it('clears the page, and does nothing for an empty line', () => {
		expect(manualFor('clear', items)).toEqual({ kind: 'clear' });
		expect(manualFor('   ', items)).toEqual({ kind: 'none' });
	});

	it('shows the full command of a long topic, whatever its length', () => {
		const long = [{ topic: 'como-me-inscribo-a-un-evento', q: '¿Cómo me inscribo?', a: 'Con el botón.' }];
		const result = manualFor('help', long);
		expect(result.kind === 'page' && result.page.sections[0]).toEqual({
			kind: 'topics',
			rows: [{ command: 'git help como-me-inscribo-a-un-evento', note: '¿Cómo me inscribo?' }],
		});
	});

	it('uses the admin alias as the topic when there is one', () => {
		const aliased = [{ topic: 'eventos', q: '¿Quién puede participar en los eventos?', a: 'Cualquier estudiante.' }];
		const result = manualFor('git help eventos', aliased);
		expect(result.kind === 'page' && result.page.current).toBe('git help eventos');
	});
});
