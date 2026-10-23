import { describe, expect, it } from 'vitest';
import { activityTypes } from '../lib/admin-content/model';
import { dictionaries, metaLabel, typeLabel, useTranslations } from './ui';

describe('ui dictionaries', () => {
	it('has the same keys in Spanish and English, with no empty value', () => {
		expect(Object.keys(dictionaries.en).sort()).toEqual(Object.keys(dictionaries.es).sort());
		for (const dictionary of Object.values(dictionaries)) {
			for (const value of Object.values(dictionary)) expect(value.trim()).not.toBe('');
		}
	});

	it('uses the same {placeholders} in both languages', () => {
		const names = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
		for (const key of Object.keys(dictionaries.es) as (keyof typeof dictionaries.es)[]) {
			expect(names(dictionaries.en[key]), key).toEqual(names(dictionaries.es[key]));
		}
	});
});

describe('useTranslations', () => {
	it('looks a key up in the locale and fills the placeholders', () => {
		expect(useTranslations('es')('activities.branch', { title: 'Hackatón' })).toBe('Actividades de Hackatón');
		expect(useTranslations('en')('activities.branch', { title: 'Hackatón' })).toBe('Activities of Hackatón');
	});
});

describe('typeLabel', () => {
	it('keeps the Spanish slug and translates it for English', () => {
		expect(typeLabel('es', 'taller')).toBe('taller');
		expect(typeLabel('en', 'taller')).toBe('workshop');
		expect(typeLabel('en', 'charla')).toBe('talk');
		expect(typeLabel('en', 'evento')).toBe('event');
	});

	it('knows every activity type', () => {
		for (const type of activityTypes) expect(Object.keys(dictionaries.en)).toContain(`type.${type}`);
	});

	it('falls back to the raw value for an unknown type', () => {
		expect(typeLabel('en', 'otro')).toBe('otro');
	});
});

describe('metaLabel', () => {
	it('translates the card meta keys and leaves unknown ones alone', () => {
		expect(metaLabel('es', 'hora')).toBe('hora');
		expect(metaLabel('en', 'hora')).toBe('time');
		expect(metaLabel('en', 'lugar')).toBe('place');
		expect(metaLabel('en', 'para')).toBe('for');
		expect(metaLabel('en', 'otro')).toBe('otro');
	});
});
