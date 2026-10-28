// Live seats of the tickets (S5). The page is static, so how many seats are left is asked once to the admin's public
// endpoint when the page loads. Pure and DOM-free: src/scripts/seats.ts paints what this returns. When the admin cannot
// be reached nothing here invents a number: the tickets keep the capacity they were built with.

export const SEATS_PATH = '/api/public/events/seats';

// The admin answers `{ events: [{ slug, capacity, registered, seatsLeft, status }] }` for every event that takes registrations.
export type SeatStatus = 'open' | 'full' | 'closed';

export interface Seat {
	slug: string;
	// null: the event has no capacity.
	capacity: number | null;
	registered: number;
	// null when there is no capacity.
	seatsLeft: number | null;
	status: SeatStatus;
}

// The seats endpoint on the admin's origin; undefined (nothing is asked) when the origin is not known.
export const seatsUrl = (origin: string | undefined): string | undefined =>
	origin ? `${origin}${SEATS_PATH}` : undefined;

const statuses: readonly unknown[] = ['open', 'full', 'closed'];
const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;

function toSeat(value: unknown): Seat | undefined {
	if (typeof value !== 'object' || value === null) return undefined;
	const { slug, capacity, registered, seatsLeft, status } = value as Record<string, unknown>;
	if (typeof slug !== 'string' || slug === '' || !statuses.includes(status)) return undefined;
	if (!isCount(registered) || (capacity !== null && !isCount(capacity))) return undefined;
	if (seatsLeft !== null && seatsLeft !== undefined && !isCount(seatsLeft)) return undefined;
	return {
		slug,
		capacity: capacity as number | null,
		registered,
		seatsLeft: (seatsLeft as number | null | undefined) ?? null,
		status: status as SeatStatus,
	};
}

// The events of an answer by slug. An event that does not match the contract is skipped (its ticket keeps its static
// capacity); an answer that is not the contract at all gives an empty map.
export function parseSeats(body: unknown): Map<string, Seat> {
	const events = typeof body === 'object' && body !== null ? (body as { events?: unknown }).events : undefined;
	const seats = new Map<string, Seat>();
	if (!Array.isArray(events)) return seats;
	for (const event of events) {
		const seat = toSeat(event);
		if (seat) seats.set(seat.slug, seat);
	}
	return seats;
}

// What a ticket shows. `state` is the admin's decision (the server stays the authority on submit); the numbers are
// there only when the event has a capacity.
export interface SeatView {
	state: SeatStatus;
	free?: number;
	total?: number;
	taken?: number;
	// 0-100: how much of the meter is filled.
	percent?: number;
}

export function seatView(seat: Seat): SeatView {
	if (seat.capacity === null) return { state: seat.status };
	const total = seat.capacity;
	const taken = Math.min(seat.registered, total);
	return {
		state: seat.status,
		free: seat.seatsLeft ?? total - taken,
		total,
		taken,
		percent: total === 0 ? 100 : Math.round((taken / total) * 100),
	};
}

const TIMEOUT_MS = 4000;

// One GET, no credentials, short timeout. Undefined on any failure (network, status, body, or no usable event): the
// caller then leaves the tickets as they were built.
export async function fetchSeats(
	url: string,
	{ fetcher = fetch, timeoutMs = TIMEOUT_MS }: { fetcher?: typeof fetch; timeoutMs?: number } = {},
): Promise<Map<string, Seat> | undefined> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetcher(url, { method: 'GET', credentials: 'omit', signal: controller.signal });
		if (!response.ok) return undefined;
		const seats = parseSeats(await response.json());
		return seats.size > 0 ? seats : undefined;
	} catch {
		return undefined;
	} finally {
		clearTimeout(timer);
	}
}
