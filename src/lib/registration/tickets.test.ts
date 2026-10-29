import { describe, expect, it } from 'vitest';
import type { TimelineEntry } from '../admin-content/model';
import { chooseTickets, closesIn, closesInLabel, ticketAnchor, ticketMode } from './tickets';

const unl = { mode: 'unl' as const, href: 'https://admin.test/foro/eventos/x' };
const open = { mode: 'open' as const, href: 'https://admin.test/foro/eventos/x' };
const entry = (id: string, overrides: Partial<TimelineEntry> = {}): TimelineEntry => ({
	id,
	kind: 'upcoming',
	title: id,
	date: '2026-11-10',
	...overrides,
});

describe('ticketMode', () => {
	it('is unl for a UNL registration and open for the open one: the admin hosts both', () => {
		expect(ticketMode(entry('a', { registration: unl }))).toBe('unl');
		expect(ticketMode(entry('b', { registration: open }))).toBe('open');
	});

	it('is free for an upcoming activity with no registration', () => {
		expect(ticketMode(entry('c'))).toBe('free');
	});
});

describe('chooseTickets', () => {
	it('keeps upcoming activities only, nearest date first, undated last', () => {
		const tickets = chooseTickets([
			entry('late', { date: '2026-12-01', registration: unl }),
			entry('past', { kind: 'commit', date: '2026-01-01', registration: unl }),
			entry('undated', { date: undefined }),
			entry('soon', { date: '2026-11-02', registration: open }),
			entry('head', { kind: 'head', date: '2026-11-01' }),
			entry('free', { date: '2026-11-20' }),
		]);
		expect(tickets.map((ticket) => [ticket.entry.id, ticket.mode])).toEqual([
			['soon', 'open'],
			['free', 'free'],
			['late', 'unl'],
			['undated', 'free'],
		]);
	});

	it('numbers only the tickets that take a registration, in the order shown', () => {
		const tickets = chooseTickets([
			entry('a', { date: '2026-11-01', registration: unl }),
			entry('b', { date: '2026-11-02' }),
			entry('c', { date: '2026-11-03', registration: open }),
		]);
		expect(tickets.map((ticket) => ticket.number)).toEqual([1, undefined, 2]);
	});

	it('is empty when nothing is upcoming', () => {
		expect(chooseTickets([entry('a', { kind: 'merge' }), entry('b', { kind: 'initial' })])).toEqual([]);
	});
});

describe('ticketAnchor', () => {
	it('is prefixed so a slug never takes the id of a section', () => {
		expect(ticketAnchor('hackathon')).toBe('inscripciones-hackathon');
	});
});

describe('closesIn', () => {
	const DAY = 86_400_000;
	const now = Date.parse('2026-10-28T12:00:00Z');
	const at = (ms: number) => new Date(now + ms).toISOString();

	it('counts whole days left', () => {
		expect(closesIn(at(14 * DAY + 3_600_000), now)).toEqual({ days: 14 });
		expect(closesIn(at(2 * DAY), now)).toEqual({ days: 2 });
		expect(closesIn(at(DAY), now)).toEqual({ days: 1 });
	});

	it('says "less than a day" in the last 24 hours', () => {
		expect(closesIn(at(DAY - 1), now)).toEqual({ days: 0 });
		expect(closesIn(at(1), now)).toEqual({ days: 0 });
	});

	it('has nothing to say once the deadline passed (exclusive, like the admin), with no deadline or an unreadable one', () => {
		expect(closesIn(at(0), now)).toBeUndefined();
		expect(closesIn(at(-DAY), now)).toBeUndefined();
		expect(closesIn(undefined, now)).toBeUndefined();
		expect(closesIn('mañana', now)).toBeUndefined();
	});
});

describe('closesInLabel', () => {
	it('picks the wording by the days left', () => {
		expect(closesInLabel(14)).toEqual({ key: 'ticket.closesIn', vars: { days: 14 } });
		expect(closesInLabel(2)).toEqual({ key: 'ticket.closesIn', vars: { days: 2 } });
		expect(closesInLabel(1)).toEqual({ key: 'ticket.closesInOne' });
		expect(closesInLabel(0)).toEqual({ key: 'ticket.closesSoon' });
	});
});
