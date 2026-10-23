import { describe, expect, it } from 'vitest';
import { completeFaqCommand, runFaqCommand, type FaqEntry } from './faq-shell';

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
