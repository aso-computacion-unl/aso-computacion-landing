import { describe, expect, it } from 'vitest';
import type { TimelineEntry } from '../admin-content/model';
import { formatDeadline, openFormWithoutSiteKey, registrationClosed } from './rules';

const DEADLINE = '2026-11-12T15:00:00.000Z';

describe('registrationClosed', () => {
	it('is open while there is no deadline', () => {
		expect(registrationClosed(undefined, Date.parse('2030-01-01T00:00:00Z'))).toBe(false);
	});

	it('is open before the deadline and closed from that exact instant (the admin treats it as exclusive)', () => {
		expect(registrationClosed(DEADLINE, Date.parse('2026-11-12T14:59:59.999Z'))).toBe(false);
		expect(registrationClosed(DEADLINE, Date.parse(DEADLINE))).toBe(true);
		expect(registrationClosed(DEADLINE, Date.parse('2026-11-13T00:00:00Z'))).toBe(true);
	});

	it('stays open when the deadline cannot be read, so the admin is the one that decides', () => {
		expect(registrationClosed('no es una fecha', Date.now())).toBe(false);
	});
});

describe('formatDeadline', () => {
	it('writes the deadline in Ecuador time, whatever the zone of the build machine', () => {
		const text = formatDeadline('2026-11-12T23:30:00.000Z', 'es');
		expect(text).toContain('noviembre');
		expect(text).toContain('18:30');
		expect(text).toContain('Ecuador');
	});

	it('crosses midnight with the Ecuador offset, not the UTC date', () => {
		expect(formatDeadline('2026-11-13T03:00:00.000Z', 'es')).toContain('12 de noviembre');
	});

	it('speaks English on the English routes', () => {
		const text = formatDeadline('2026-11-12T23:30:00.000Z', 'en');
		expect(text).toContain('November 12');
		expect(text).toContain('Ecuador');
	});
});

describe('openFormWithoutSiteKey', () => {
	const entry = (
		id: string,
		registration: TimelineEntry['registration'],
		kind: TimelineEntry['kind'] = 'upcoming',
	): TimelineEntry => ({
		id,
		kind,
		title: id,
		registration,
	});
	const open = { mode: 'open' as const, href: 'https://admin.test/api/x' };

	it('names the events whose open form cannot be shown because the Turnstile site key is missing', () => {
		const entries = [
			entry('a', open),
			entry('b', { mode: 'unl', href: 'https://admin.test/foro/eventos/b' }),
			entry('c', undefined),
			entry('d', open),
		];
		expect(openFormWithoutSiteKey(entries, undefined)).toEqual(['a', 'd']);
		expect(openFormWithoutSiteKey(entries, '   ')).toEqual(['a', 'd']);
	});

	it('finds nothing to report when the key is set or no event uses the open form', () => {
		expect(openFormWithoutSiteKey([entry('a', open)], '0x4AAAA')).toEqual([]);
		expect(
			openFormWithoutSiteKey([entry('b', { mode: 'unl', href: 'https://admin.test/foro/eventos/b' })], undefined),
		).toEqual([]);
	});
});
