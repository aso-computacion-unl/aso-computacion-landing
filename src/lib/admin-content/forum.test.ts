import { describe, expect, it } from 'vitest';
import { adminOriginOf, eventUrl, eventsUrl, forumUrl } from './forum';

describe('adminOriginOf', () => {
	it('reduces the content URL to its origin', () => {
		expect(adminOriginOf('https://admin.example.test/api/public/content')).toBe('https://admin.example.test');
		expect(adminOriginOf('  https://admin.example.test:8443/api/public/content?x=1 ')).toBe(
			'https://admin.example.test:8443',
		);
	});

	it('accepts plain http only for a local admin', () => {
		expect(adminOriginOf('http://localhost:3000/api/public/content')).toBe('http://localhost:3000');
		expect(adminOriginOf('http://127.0.0.1:3000/api/public/content')).toBe('http://127.0.0.1:3000');
		expect(adminOriginOf('http://admin.example.test/api/public/content')).toBeUndefined();
	});

	it('is undefined when there is no usable admin URL', () => {
		expect(adminOriginOf(undefined)).toBeUndefined();
		expect(adminOriginOf('   ')).toBeUndefined();
		expect(adminOriginOf('not a url')).toBeUndefined();
		expect(adminOriginOf('javascript:alert(1)')).toBeUndefined();
		expect(adminOriginOf('https://user:secret@admin.example.test/api/public/content')).toBeUndefined();
	});
});

describe('forumUrl', () => {
	it('puts /foro on the admin origin', () => {
		expect(forumUrl('https://admin.example.test')).toBe('https://admin.example.test/foro');
	});

	it('leaves the link out when the origin is unknown', () => {
		expect(forumUrl(undefined)).toBeUndefined();
	});
});

describe('eventsUrl', () => {
	it('puts the list of events under the forum, on the admin origin', () => {
		expect(eventsUrl('https://admin.example.test')).toBe('https://admin.example.test/foro/eventos');
	});

	it('leaves the link out when the origin is unknown', () => {
		expect(eventsUrl(undefined)).toBeUndefined();
	});
});

describe('eventUrl', () => {
	it('puts the event page of a slug under the registration route, on the admin origin', () => {
		expect(eventUrl('https://admin.example.test', 'taller-de-git')).toBe(
			'https://admin.example.test/inscripciones/taller-de-git',
		);
	});

	it('encodes the slug so it can never leave its path segment', () => {
		expect(eventUrl('https://admin.example.test', '../admin?x=1#y')).toBe(
			'https://admin.example.test/inscripciones/..%2Fadmin%3Fx%3D1%23y',
		);
	});

	it('leaves the link out when the origin is unknown', () => {
		expect(eventUrl(undefined, 'taller-de-git')).toBeUndefined();
	});
});
