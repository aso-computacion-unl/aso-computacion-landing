import { toLocale } from '../i18n/locales';
import { useTranslations, type UiKey } from '../i18n/ui';
import {
	buildPayload,
	firstInvalidField,
	formFields,
	type FormField,
	type FormValues,
} from '../lib/registration/fields';
import { endsRegistration, messageKey, type Outcome } from '../lib/registration/outcome';
import { registrationClosed } from '../lib/registration/rules';
import { submitRegistration } from '../lib/registration/submit';
import { closesIn, closesInLabel } from '../lib/registration/tickets';
import { closeTicket, relayout } from './ticket';

// Event registration (S8), loaded only on pages that have a ticket that takes registrations (components/Ticket.astro).
// The server renders everything; this closes what expired since the build, keeps the days left honest and runs the open
// form: it unfolds under its ticket, Cloudflare Turnstile loads on first unfold, then the checks, the POST to the admin
// and an accessible message for every outcome.

const locale = toLocale(document.documentElement.lang);
const t = useTranslations(locale);

interface TurnstileApi {
	render: (
		container: HTMLElement,
		options: {
			sitekey: string;
			theme: 'light' | 'dark';
			language: string;
			callback: (token: string) => void;
			'expired-callback': () => void;
			'error-callback': () => void;
		},
	) => string;
	reset: (widgetId: string) => void;
}

declare global {
	interface Window {
		turnstile?: TurnstileApi;
	}
}

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let turnstileLoad: Promise<TurnstileApi> | undefined;

// One script for every form on the page; a failed load can be retried the next time a form opens.
const loadTurnstile = (): Promise<TurnstileApi> => {
	turnstileLoad ??= new Promise<TurnstileApi>((resolve, reject) => {
		const ready = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not start')));
		if (window.turnstile) return ready();
		const script = document.createElement('script');
		script.src = TURNSTILE_SRC;
		script.async = true;
		script.onload = ready;
		script.onerror = () => reject(new Error('Turnstile did not load'));
		document.head.append(script);
	}).catch((error: unknown) => {
		turnstileLoad = undefined;
		throw error;
	});
	return turnstileLoad;
};

function closeIfExpired(block: HTMLElement): boolean {
	if (!registrationClosed(block.dataset.regDeadline, Date.now())) return false;
	closeTicket(block, t('ticket.closed'));
	return true;
}

// The page was built days ago: "Cierra en 14 días" is recomputed with the visitor's clock.
function refreshDaysLeft(block: HTMLElement) {
	const label = block.querySelector<HTMLElement>('[data-reg-closes]');
	const left = closesIn(block.dataset.regDeadline, Date.now());
	if (!label || !left) return;
	const { key, vars } = closesInLabel(left.days);
	label.textContent = t(key, vars);
}

function setupForm(block: HTMLElement, form: HTMLFormElement) {
	const trigger = block.querySelector<HTMLButtonElement>('[data-reg-action]');
	const close = block.querySelector<HTMLButtonElement>('[data-reg-close]');
	const captcha = form.querySelector<HTMLElement>('[data-reg-captcha]');
	const submit = form.querySelector<HTMLButtonElement>('[data-reg-submit]');
	const errorBox = form.querySelector<HTMLElement>('[data-reg-error]');
	const okBox = form.querySelector<HTMLElement>('[data-reg-ok]');
	const { endpoint, siteKey } = form.dataset;
	if (!trigger || !close || !captcha || !submit || !errorBox || !okBox || !endpoint || !siteKey) return;

	const input = (field: FormField) => form.elements.namedItem(field) as HTMLInputElement;
	const fieldError = (field: FormField) => form.querySelector<HTMLElement>(`[data-reg-field-error="${field}"]`);
	let token: string | null = null;
	let widgetId: string | undefined;
	let busy = false;
	// The person pressed send before the check was done: the message goes away once the check is.
	let waitingForCheck = false;

	const clearMessages = () => {
		waitingForCheck = false;
		errorBox.textContent = '';
		okBox.textContent = '';
		for (const field of formFields) {
			const error = fieldError(field);
			if (error) error.textContent = '';
			input(field).removeAttribute('aria-invalid');
		}
	};

	const say = (box: HTMLElement, key: UiKey) => {
		clearMessages();
		box.textContent = t(key);
	};

	const showOutcome = (outcome: Outcome) => {
		if (outcome.code === 'registered') {
			say(okBox, messageKey(outcome));
			form.classList.add('is-done');
			okBox.focus();
		} else if (outcome.code === 'validation' && outcome.field) {
			clearMessages();
			const error = fieldError(outcome.field);
			if (error) error.textContent = t(messageKey(outcome));
			input(outcome.field).setAttribute('aria-invalid', 'true');
			input(outcome.field).focus();
		} else if (endsRegistration(outcome.code)) {
			say(errorBox, messageKey(outcome));
			form.classList.add('is-done');
			errorBox.focus();
		} else {
			say(errorBox, messageKey(outcome));
		}
		relayout();
	};

	const mountWidget = () => {
		if (widgetId !== undefined) return;
		widgetId = '';
		loadTurnstile().then(
			(api) => {
				widgetId = api.render(captcha, {
					sitekey: siteKey,
					theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
					language: locale,
					callback: (value) => {
						token = value;
						if (waitingForCheck) clearMessages();
					},
					'expired-callback': () => {
						token = null;
					},
					'error-callback': () => {
						token = null;
						showOutcome({ code: 'captcha' });
					},
				});
			},
			() => {
				widgetId = undefined;
				showOutcome({ code: 'captcha' });
			},
		);
	};

	const setOpen = (open: boolean) => {
		block.classList.toggle('is-open', open);
		trigger.setAttribute('aria-expanded', String(open));
		if (open && !closeIfExpired(block)) mountWidget();
		relayout();
	};
	trigger.addEventListener('click', () => setOpen(!block.classList.contains('is-open')));
	close.addEventListener('click', () => {
		setOpen(false);
		trigger.focus();
	});

	// A field that was wrong stops being flagged as soon as the person edits it.
	form.addEventListener('input', (event) => {
		const field = (event.target as HTMLInputElement).name as FormField;
		if (!formFields.includes(field)) return;
		input(field).removeAttribute('aria-invalid');
		const error = fieldError(field);
		if (error) error.textContent = '';
	});

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		if (busy || form.classList.contains('is-done')) return;
		if (closeIfExpired(block)) return;

		const values = Object.fromEntries(formFields.map((field) => [field, input(field).value])) as FormValues;
		const invalid = firstInvalidField(values);
		if (invalid) return showOutcome({ code: 'validation', field: invalid });
		if (!token) {
			showOutcome({ code: 'captcha' });
			waitingForCheck = true;
			return;
		}

		busy = true;
		submit.setAttribute('aria-disabled', 'true');
		form.setAttribute('aria-busy', 'true');
		submit.textContent = t('registration.sending');
		const outcome = await submitRegistration(endpoint, buildPayload(values, token));
		busy = false;
		submit.removeAttribute('aria-disabled');
		form.removeAttribute('aria-busy');
		submit.textContent = t('registration.submit');

		// A Turnstile token works once, whatever the answer was.
		token = null;
		if (widgetId) window.turnstile?.reset(widgetId);
		showOutcome(outcome);
	});

	// Only now is it safe to submit: the handler above is attached. Until then (or if this script never loads) the button
	// is disabled, which also blocks submitting with Enter from a field.
	submit.disabled = false;
}

document.querySelectorAll<HTMLElement>('[data-reg]').forEach((block) => {
	if (closeIfExpired(block)) return;
	refreshDaysLeft(block);
	const form = block.querySelector<HTMLFormElement>('[data-reg-form]');
	if (form) setupForm(block, form);
});
