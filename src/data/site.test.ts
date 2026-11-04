import { describe, expect, it } from 'vitest';
import { contactEmail, copy } from './site';

describe('contactEmail', () => {
	it('is the association address, the one value the footer and the structured data share', () => {
		expect(contactEmail).toBe('aso.computacion@gmail.com');
	});
});

describe('Nosotros statement', () => {
	it('falls back to one sentence per language when the admin sends no about text, with the university highlighted', () => {
		expect(copy.es.site.about).toBe('Representamos a quienes estudian Computación en la Universidad Nacional de Loja.');
		expect(copy.en.site.about).toBe(
			'We represent the students of Computer Science at the Universidad Nacional de Loja.',
		);
		for (const locale of ['es', 'en'] as const) {
			expect(copy[locale].aboutStatement.accents).toContain('Universidad Nacional de Loja');
			for (const accent of copy[locale].aboutStatement.accents.filter((a) => a !== 'Computación' || locale === 'es'))
				expect(copy[locale].site.about).toContain(accent);
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
