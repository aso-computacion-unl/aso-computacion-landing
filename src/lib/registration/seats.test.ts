import { describe, expect, it } from 'vitest';
import { fetchSeats, parseSeats, seatsUrl, seatView, type Seat } from './seats';

const seat = (overrides: Partial<Seat> = {}): Seat => ({
	slug: 'taller',
	capacity: 120,
	registered: 112,
	seatsLeft: 8,
	status: 'open',
	...overrides,
});

describe('seatsUrl', () => {
	it('is the admin origin plus the public seats path, and nothing when the origin is unknown', () => {
		expect(seatsUrl('https://admin.test')).toBe('https://admin.test/api/public/events/seats');
		expect(seatsUrl(undefined)).toBeUndefined();
	});
});

describe('parseSeats', () => {
	it('indexes the events by slug', () => {
		const seats = parseSeats({
			events: [
				{ slug: 'a', capacity: 40, registered: 3, seatsLeft: 37, status: 'open' },
				{ slug: 'b', capacity: null, registered: 0, seatsLeft: null, status: 'closed' },
			],
		});
		expect([...seats.keys()]).toEqual(['a', 'b']);
		expect(seats.get('b')).toEqual({ slug: 'b', capacity: null, registered: 0, seatsLeft: null, status: 'closed' });
	});

	it('skips an event that does not match the contract and keeps the rest', () => {
		const seats = parseSeats({
			events: [
				null,
				'x',
				{ slug: '', capacity: 1, registered: 0, seatsLeft: 1, status: 'open' },
				{ slug: 'status', capacity: 1, registered: 0, seatsLeft: 1, status: 'maybe' },
				{ slug: 'negative', capacity: 1, registered: -1, seatsLeft: 1, status: 'open' },
				{ slug: 'fraction', capacity: 1.5, registered: 0, seatsLeft: 1, status: 'open' },
				{ slug: 'missing', capacity: 1, status: 'open' },
				{ slug: 'ok', capacity: 1, registered: 0, seatsLeft: 1, status: 'open' },
			],
		});
		expect([...seats.keys()]).toEqual(['ok']);
	});

	it('is empty for an answer that is not the contract', () => {
		for (const body of [undefined, null, 'html', 3, [], {}, { events: 'x' }]) expect(parseSeats(body).size).toBe(0);
	});
});

describe('seatView', () => {
	it('reads the free seats and fills the meter with the taken ones', () => {
		expect(seatView(seat())).toEqual({ state: 'open', free: 8, total: 120, taken: 112, percent: 93 });
		expect(seatView(seat({ capacity: 60, registered: 42, seatsLeft: 18 }))).toMatchObject({ free: 18, percent: 70 });
	});

	it('carries the status as the admin decided it, with the numbers it has', () => {
		expect(seatView(seat({ registered: 120, seatsLeft: 0, status: 'full' }))).toEqual({
			state: 'full',
			free: 0,
			total: 120,
			taken: 120,
			percent: 100,
		});
		expect(seatView(seat({ status: 'closed' })).state).toBe('closed');
	});

	it('has no numbers when the event has no capacity: nothing is invented', () => {
		expect(seatView(seat({ capacity: null, registered: 5, seatsLeft: null }))).toEqual({ state: 'open' });
	});

	it('never shows a negative or overfull meter', () => {
		expect(seatView(seat({ registered: 130, seatsLeft: 0 }))).toMatchObject({ taken: 120, percent: 100, free: 0 });
		expect(seatView(seat({ capacity: 0, registered: 0, seatsLeft: 0 }))).toMatchObject({ total: 0, percent: 100 });
	});

	it('derives the free seats when the admin left them out', () => {
		expect(seatView(seat({ seatsLeft: null }))).toMatchObject({ free: 8 });
	});
});

describe('fetchSeats', () => {
	const answer = (status: number, body: unknown): typeof fetch =>
		(() => Promise.resolve(new Response(JSON.stringify(body), { status }))) as typeof fetch;
	const body = { events: [{ slug: 'a', capacity: 10, registered: 1, seatsLeft: 9, status: 'open' }] };

	it('returns the parsed seats of a good answer', async () => {
		const seats = await fetchSeats('https://admin.test/seats', { fetcher: answer(200, body) });
		expect(seats?.get('a')?.seatsLeft).toBe(9);
	});

	it('asks without credentials, as a plain cross-origin GET', async () => {
		let init: RequestInit | undefined;
		const fetcher = ((_url: string, options?: RequestInit) => {
			init = options;
			return Promise.resolve(new Response(JSON.stringify(body)));
		}) as typeof fetch;
		await fetchSeats('https://admin.test/seats', { fetcher });
		expect(init).toMatchObject({ credentials: 'omit', method: 'GET' });
	});

	it('is undefined on an error status, bad JSON, a network failure or an answer with no valid event', async () => {
		expect(await fetchSeats('u', { fetcher: answer(503, body) })).toBeUndefined();
		expect(
			await fetchSeats('u', { fetcher: (() => Promise.resolve(new Response('<html>'))) as typeof fetch }),
		).toBeUndefined();
		expect(
			await fetchSeats('u', { fetcher: (() => Promise.reject(new Error('offline'))) as typeof fetch }),
		).toBeUndefined();
		expect(await fetchSeats('u', { fetcher: answer(200, { events: [] }) })).toBeUndefined();
	});

	it('gives up when the admin is slow', async () => {
		const slow = ((_url: string, options?: RequestInit) =>
			new Promise((_resolve, reject) => {
				options?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
			})) as typeof fetch;
		const started = Date.now();
		expect(await fetchSeats('u', { fetcher: slow, timeoutMs: 30 })).toBeUndefined();
		expect(Date.now() - started).toBeLessThan(1000);
	});
});
