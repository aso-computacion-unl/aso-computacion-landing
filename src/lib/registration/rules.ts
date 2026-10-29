import type { Locale } from '../../i18n/locales';

// Registration rules the landing can evaluate by itself. The seats left are not known here (the site is static), so
// "full" is only ever learned from the admin's seats answer; see seats.ts.

// The admin closes registration from the deadline instant on (exclusive). The page is built ahead of time, so the card
// asks again in the browser with the visitor's clock. An unreadable deadline never closes anything: the admin decides.
export function registrationClosed(deadline: string | undefined, now: number): boolean {
	if (deadline === undefined) return false;
	const instant = Date.parse(deadline);
	return !Number.isNaN(instant) && now >= instant;
}

const TIME_ZONE = 'America/Guayaquil';

// "12 de noviembre de 2026, 18:30 (hora de Ecuador)". Always Ecuador time: the association and its events live there,
// and a visitor's own zone would make the same deadline read differently on every machine.
export function formatDeadline(deadline: string, locale: Locale): string {
	const at = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-EC', {
		timeZone: TIME_ZONE,
		dateStyle: 'long',
		timeStyle: 'short',
		hourCycle: 'h23',
	}).format(new Date(deadline));
	return locale === 'en' ? `${at} (Ecuador time)` : `${at} (hora de Ecuador)`;
}
