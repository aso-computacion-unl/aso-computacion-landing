import { toLocale } from '../i18n/locales';
import { useTranslations } from '../i18n/ui';
import { registrationClosed } from '../lib/registration/rules';
import { closesIn, closesInLabel } from '../lib/registration/tickets';
import { closeTicket } from './ticket';

// Deadlines of the tickets that take a registration (Ticket.astro, `data-reg`). The page was built days ago: what
// expired since is closed with the visitor's clock, and "Cierra en 14 días" is counted again. The admin stays the
// authority when someone signs up.

const t = useTranslations(toLocale(document.documentElement.lang));

document.querySelectorAll<HTMLElement>('[data-reg]').forEach((ticket) => {
	const deadline = ticket.dataset.regDeadline;
	if (registrationClosed(deadline, Date.now())) return closeTicket(ticket, t('ticket.closed'));
	const label = ticket.querySelector<HTMLElement>('[data-reg-closes]');
	const left = closesIn(deadline, Date.now());
	if (!label || !left) return;
	const { key, vars } = closesInLabel(left.days);
	label.textContent = t(key, vars);
});
