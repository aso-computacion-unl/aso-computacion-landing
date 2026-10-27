// Registration rules the landing can evaluate by itself. The seats left are not known here (the site is static), so
// "full" is only ever learned from the admin's answer; see outcome.ts.

// The admin closes registration from the deadline instant on (exclusive). The page is built ahead of time, so the card
// asks again in the browser with the visitor's clock. An unreadable deadline never closes anything: the admin decides.
export function registrationClosed(deadline: string | undefined, now: number): boolean {
	if (deadline === undefined) return false;
	const instant = Date.parse(deadline);
	return !Number.isNaN(instant) && now >= instant;
}
