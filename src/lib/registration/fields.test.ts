import { describe, expect, it } from 'vitest';
import { buildPayload, firstInvalidField, type FormValues } from './fields';

const valid: FormValues = { name: ' Ana Mora ', email: ' ana@unl.edu.ec ', career: 'Computación', semester: '5' };

describe('firstInvalidField', () => {
	it('accepts what the admin accepts', () => {
		expect(firstInvalidField(valid)).toBeNull();
		expect(firstInvalidField({ ...valid, semester: '1' })).toBeNull();
		expect(firstInvalidField({ ...valid, semester: '12' })).toBeNull();
		expect(firstInvalidField({ ...valid, name: 'a'.repeat(120) })).toBeNull();
	});

	it('names the first field in form order that the admin would refuse', () => {
		expect(firstInvalidField({ ...valid, name: '   ' })).toBe('name');
		expect(firstInvalidField({ ...valid, name: 'a'.repeat(121) })).toBe('name');
		expect(firstInvalidField({ ...valid, name: 'Ana\u0000' })).toBe('name');
		expect(firstInvalidField({ ...valid, email: 'ana' })).toBe('email');
		expect(firstInvalidField({ ...valid, email: `${'a'.repeat(250)}@x.ec` })).toBe('email');
		expect(firstInvalidField({ ...valid, career: '' })).toBe('career');
		expect(firstInvalidField({ ...valid, career: 'a'.repeat(121) })).toBe('career');
		for (const semester of ['', '0', '13', '2.5', 'cinco', '-1', '1e1']) {
			expect(firstInvalidField({ ...valid, semester }), semester).toBe('semester');
		}
		expect(firstInvalidField({ name: '', email: '', career: '', semester: '' })).toBe('name');
	});
});

describe('buildPayload', () => {
	it('trims the text, sends the semester as a number and adds the Turnstile token', () => {
		expect(buildPayload(valid, 'token-123')).toEqual({
			name: 'Ana Mora',
			email: 'ana@unl.edu.ec',
			career: 'Computación',
			semester: 5,
			turnstileToken: 'token-123',
		});
	});
});
