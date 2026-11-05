import { describe, expect, it } from 'vitest';
import { privacy, privacyUpdated } from './privacy';

describe('privacy policy copy', () => {
	it('has the same sections in the same order in Spanish and English', () => {
		const ids = (locale: 'es' | 'en') => privacy[locale].sections.map((section) => section.id);
		expect(ids('en')).toEqual(ids('es'));
		expect(privacy.en.contact.id).toBe(privacy.es.contact.id);
	});

	it('has no empty text and no unfilled placeholder', () => {
		for (const copy of Object.values(privacy)) {
			const texts = [
				copy.title,
				copy.description,
				copy.lead,
				...copy.sections.flatMap((section) => [section.heading, section.body]),
				copy.contact.heading,
				copy.contact.before,
			];
			for (const text of texts) {
				expect(text.trim()).not.toBe('');
				expect(text).not.toMatch(/\[[A-ZÁÉÍÓÚ ]{6,}\]/);
			}
		}
	});

	it('dates its review in ISO form', () => {
		expect(privacyUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});
