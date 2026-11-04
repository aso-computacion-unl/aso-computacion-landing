import { describe, expect, it } from 'vitest';
import { contactEmail, copy } from './site';

describe('contactEmail', () => {
	it('is the association address, the one value the footer and the structured data share', () => {
		expect(contactEmail).toBe('aso.computacion@gmail.com');
	});
});

describe('Nosotros statement', () => {
	const sentence = (locale: 'es' | 'en') => copy[locale].aboutStatement.parts.map((part) => part.text).join('');

	it('is one sentence per language, with the university highlighted', () => {
		expect(sentence('es')).toBe('Representamos a quienes estudian Computación en la Universidad Nacional de Loja.');
		expect(sentence('en')).toBe('We represent the students of Computer Science at the Universidad Nacional de Loja.');
		for (const locale of ['es', 'en'] as const) {
			const accents = copy[locale].aboutStatement.parts.filter((part) => part.accent).map((part) => part.text);
			expect(accents).toContain('Universidad Nacional de Loja');
		}
	});
});

describe('Ideas steps', () => {
	it('are titles only, in both languages and the same number', () => {
		for (const locale of ['es', 'en'] as const) {
			for (const reason of copy[locale].join.reasons) expect(Object.keys(reason)).toEqual(['title']);
		}
		expect(copy.en.join.reasons).toHaveLength(copy.es.join.reasons.length);
	});
});
