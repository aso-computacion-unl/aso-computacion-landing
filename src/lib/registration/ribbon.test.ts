import { describe, expect, it } from 'vitest';
import type { TimelineEntry } from '../admin-content/model';
import { ribbonItems, ribbonLoop } from './ribbon';
import { chooseTickets } from './tickets';

const unl = { mode: 'unl' as const, href: 'https://admin.test/foro/eventos/x', capacity: 40 };
const entry = (id: string, overrides: Partial<TimelineEntry> = {}): TimelineEntry => ({
	id,
	kind: 'upcoming',
	title: id,
	date: '2026-11-10',
	...overrides,
});

const upcoming = chooseTickets([
	entry('python', { title: 'Taller de Python para primer ciclo', date: '2026-11-12' }),
	entry('hack', { title: 'Hackatón', date: '2026-11-28', registration: unl }),
	entry('feria', { title: 'Feria de proyectos y cierre de ciclo', date: '2026-12-05' }),
	entry('later', { title: 'Cuarta', date: '2026-12-20' }),
]);

describe('ribbonItems', () => {
	it('names the next three activities, then sends to the forum and to Instagram', () => {
		expect(ribbonItems(upcoming, 'es')).toEqual([
			'Próximo: Taller de Python para primer ciclo · 12 nov',
			'Hackatón · 28 nov · cupos limitados',
			'Feria de proyectos y cierre de ciclo · 5 dic · entrada libre',
			'Pregunta en el foro',
			'Todo se anuncia primero en Instagram',
		]);
	});

	it('keeps every title whole: a word like "para" or "y" can be part of what the activity is', () => {
		const tickets = chooseTickets([
			entry('web', { title: 'Herramientas para desarrollo web', date: '2026-11-10' }),
			entry('git', { title: 'Taller de Git y GitHub', date: '2026-11-11' }),
		]);
		expect(ribbonItems(tickets, 'es').slice(0, 2)).toEqual([
			'Próximo: Herramientas para desarrollo web · 10 nov',
			'Taller de Git y GitHub · 11 nov · entrada libre',
		]);
	});

	it('speaks English on the English page', () => {
		const items = ribbonItems(
			chooseTickets([entry('ws', { title: 'Python workshop for first years', date: '2026-11-12' })]),
			'en',
		);
		expect(items).toEqual([
			'Next: Python workshop for first years · Nov 12',
			'Ask in the forum',
			'Everything is announced first on Instagram',
		]);
	});

	it('says "cupos limitados" only when the registration has a capacity', () => {
		const tickets = chooseTickets([
			entry('a', { title: 'Primera', date: '2026-11-01' }),
			entry('b', { title: 'Sin cupo', date: '2026-11-02', registration: { ...unl, capacity: undefined } }),
		]);
		expect(ribbonItems(tickets, 'es')[1]).toBe('Sin cupo · 2 nov');
	});

	it('never names a demo activity as if it were real', () => {
		const tickets = chooseTickets([
			entry('demo', { title: 'Ejemplo', date: '2026-11-01', demo: true }),
			entry('real', { title: 'Real', date: '2026-11-02' }),
		]);
		expect(ribbonItems(tickets, 'es')).toEqual([
			'Próximo: Real · 2 nov',
			'Pregunta en el foro',
			'Todo se anuncia primero en Instagram',
		]);
	});

	it('says only the month of an activity dated to the month, never an unconfirmed day', () => {
		const tickets = chooseTickets([entry('m', { title: 'Feria', date: '2026-11-01', datePrecision: 'month' })]);
		expect(ribbonItems(tickets, 'es')[0]).toBe('Próximo: Feria · nov');
		expect(ribbonItems(tickets, 'en')[0]).toBe('Next: Feria · Nov');
	});

	it('leaves the date out of an undated activity and keeps only the way out when nothing is coming', () => {
		expect(ribbonItems(chooseTickets([entry('x', { title: 'Sin fecha', date: undefined })]), 'es')[0]).toBe(
			'Próximo: Sin fecha',
		);
		expect(ribbonItems([], 'es')).toEqual(['Pregunta en el foro', 'Todo se anuncia primero en Instagram']);
	});
});

describe('ribbonLoop', () => {
	const chars = (items: string[]) => items.join('').length;

	it('repeats a short list, whole, until it is long enough to fill a wide band', () => {
		const loop = ribbonLoop(['Pregunta en el foro', 'Todo se anuncia primero en Instagram']);
		expect(chars(loop)).toBeGreaterThanOrEqual(260);
		expect(loop.length % 2).toBe(0);
		expect(loop.slice(0, 2)).toEqual(['Pregunta en el foro', 'Todo se anuncia primero en Instagram']);
	});

	it('leaves a list that is already long enough as it is', () => {
		const long = Array.from({ length: 6 }, (_, i) => `Actividad ${i} con un nombre bastante largo y su fecha`);
		expect(ribbonLoop(long)).toEqual(long);
	});
});
