import { describe, expect, it } from 'vitest';
import type { TimelineEntry } from '../admin-content/model';
import { ribbonItems } from './ribbon';
import { chooseTickets } from './tickets';

const unl = { mode: 'unl' as const, href: 'https://admin.test/foro/eventos/x' };
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
			'Próximo: Taller de Python · 12 nov',
			'Hackatón · 28 nov · cupos limitados',
			'Feria de proyectos · 5 dic · entrada libre',
			'Pregunta en el foro',
			'Todo se anuncia primero en Instagram',
		]);
	});

	it('speaks English on the English page', () => {
		const items = ribbonItems(
			chooseTickets([entry('ws', { title: 'Python workshop for first years', date: '2026-11-12' })]),
			'en',
		);
		expect(items).toEqual([
			'Next: Python workshop · Nov 12',
			'Ask in the forum',
			'Everything is announced first on Instagram',
		]);
	});

	it('leaves the date out of an undated activity and keeps only the way out when nothing is coming', () => {
		expect(ribbonItems(chooseTickets([entry('x', { title: 'Sin fecha', date: undefined })]), 'es')[0]).toBe(
			'Próximo: Sin fecha',
		);
		expect(ribbonItems([], 'es')).toEqual(['Pregunta en el foro', 'Todo se anuncia primero en Instagram']);
	});
});
