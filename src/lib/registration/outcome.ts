// What the admin's open-registration endpoint can answer, as the form reacts to it. Every status and error code of the
// contract has its own outcome, so no answer is ever shown as a success by accident (docs/REFERENCIA.md, "Event
// registration").
import type { UiKey } from '../../i18n/ui';
import { formFields, type FormField } from './fields';

export type OutcomeCode =
	| 'registered'
	| 'validation'
	| 'captcha'
	| 'duplicate'
	| 'full'
	| 'closed'
	| 'not_found'
	| 'rate_limited'
	| 'unavailable'
	| 'failed'
	// The request never got an answer (offline, blocked by CORS, timed out).
	| 'network';

export interface Outcome {
	code: OutcomeCode;
	// `validation` only: the field the admin refused.
	field?: FormField;
}

const isFormField = (value: unknown): value is FormField => (formFields as readonly unknown[]).includes(value);

const errorOf = (body: unknown): unknown =>
	typeof body === 'object' && body !== null ? (body as { error?: unknown }).error : undefined;

export function classifyResponse(status: number, body: unknown): Outcome {
	const error = errorOf(body);
	if (status === 201) return { code: 'registered' };
	if (status === 400) {
		if (error === 'captcha') return { code: 'captcha' };
		const field = typeof body === 'object' && body !== null ? (body as { field?: unknown }).field : undefined;
		return error === 'validation' && isFormField(field) ? { code: 'validation', field } : { code: 'failed' };
	}
	if (status === 404) return { code: 'not_found' };
	if (status === 409)
		return error === 'duplicate' || error === 'full' || error === 'closed' ? { code: error } : { code: 'failed' };
	if (status === 429) return { code: 'rate_limited' };
	if (status >= 500) return { code: 'unavailable' };
	return { code: 'failed' };
}

const MESSAGES: Record<Exclude<OutcomeCode, 'validation'>, UiKey> = {
	registered: 'registration.ok',
	captcha: 'registration.captcha',
	duplicate: 'registration.duplicate',
	full: 'registration.full',
	closed: 'registration.closed',
	not_found: 'registration.notFound',
	rate_limited: 'registration.rateLimited',
	unavailable: 'registration.unavailable',
	failed: 'registration.failed',
	network: 'registration.network',
};

const FIELD_MESSAGES: Record<FormField, UiKey> = {
	name: 'registration.invalid.name',
	email: 'registration.invalid.email',
	career: 'registration.invalid.career',
	semester: 'registration.invalid.semester',
};

export function messageKey(outcome: Outcome): UiKey {
	if (outcome.code !== 'validation') return MESSAGES[outcome.code];
	return outcome.field ? FIELD_MESSAGES[outcome.field] : MESSAGES.failed;
}

// Full, closed or no longer open: asking again cannot work, so the form gives way to the message.
export const endsRegistration = (code: OutcomeCode): boolean =>
	code === 'full' || code === 'closed' || code === 'not_found';
