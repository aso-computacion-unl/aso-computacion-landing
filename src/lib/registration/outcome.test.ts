import { describe, expect, it } from 'vitest';
import { dictionaries } from '../../i18n/ui';
import { classifyResponse, endsRegistration, messageKey, type OutcomeCode } from './outcome';

describe('classifyResponse: every answer of the admin endpoint', () => {
	it('201 is a registration', () => {
		expect(classifyResponse(201, { ok: true })).toEqual({ code: 'registered' });
	});

	it('400 validation names the field that failed, and only a field the form has', () => {
		for (const field of ['name', 'email', 'career', 'semester'] as const) {
			expect(classifyResponse(400, { error: 'validation', field })).toEqual({ code: 'validation', field });
		}
		expect(classifyResponse(400, { error: 'validation', field: 'turnstileToken' })).toEqual({ code: 'failed' });
		expect(classifyResponse(400, { error: 'validation' })).toEqual({ code: 'failed' });
	});

	it('400 captcha is told apart from a malformed request', () => {
		expect(classifyResponse(400, { error: 'captcha' })).toEqual({ code: 'captcha' });
		expect(classifyResponse(400, { error: 'bad_request' })).toEqual({ code: 'failed' });
	});

	it('404 means the event takes no open registration (any more)', () => {
		expect(classifyResponse(404, { error: 'not_found' })).toEqual({ code: 'not_found' });
	});

	it('409 tells duplicate, full and closed apart', () => {
		for (const error of ['duplicate', 'full', 'closed'] as const) {
			expect(classifyResponse(409, { error })).toEqual({ code: error });
		}
		expect(classifyResponse(409, { error: 'otra' })).toEqual({ code: 'failed' });
	});

	it('429 is rate limited', () => {
		expect(classifyResponse(429, { error: 'rate_limited' })).toEqual({ code: 'rate_limited' });
	});

	it('503 and any 5xx are the service being unavailable', () => {
		expect(classifyResponse(503, { error: 'unavailable' })).toEqual({ code: 'unavailable' });
		expect(classifyResponse(502, null)).toEqual({ code: 'unavailable' });
		expect(classifyResponse(500, 'html')).toEqual({ code: 'unavailable' });
	});

	it('413, 415 and anything unexpected are a generic failure, never a success', () => {
		for (const status of [413, 415, 401, 302, 200])
			expect(classifyResponse(status, {}), String(status)).toEqual({ code: 'failed' });
		expect(classifyResponse(409, null)).toEqual({ code: 'failed' });
	});
});

describe('messageKey', () => {
	const codes: OutcomeCode[] = [
		'registered',
		'validation',
		'captcha',
		'duplicate',
		'full',
		'closed',
		'not_found',
		'rate_limited',
		'unavailable',
		'failed',
		'network',
	];

	it('has a Spanish and an English message for every outcome and every field', () => {
		for (const code of codes) {
			for (const key of code === 'validation'
				? (['name', 'email', 'career', 'semester'] as const).map((field) => messageKey({ code, field }))
				: [messageKey({ code })]) {
				for (const locale of ['es', 'en'] as const) expect(dictionaries[locale][key], `${locale} ${key}`).toBeTruthy();
			}
		}
	});

	it('falls back to the generic message when a validation answer names no field', () => {
		expect(messageKey({ code: 'validation' })).toBe(messageKey({ code: 'failed' }));
	});
});

describe('endsRegistration', () => {
	it('is true when retrying cannot help: full, closed and not found', () => {
		for (const code of ['full', 'closed', 'not_found'] as const) expect(endsRegistration(code)).toBe(true);
		for (const code of [
			'registered',
			'duplicate',
			'captcha',
			'rate_limited',
			'unavailable',
			'failed',
			'network',
			'validation',
		] as const) {
			expect(endsRegistration(code), code).toBe(false);
		}
	});
});
