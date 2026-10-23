import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import fallback from '../../data/fallback.json';
import { parsePublicContent } from './validate';

const root = resolve(import.meta.dirname, '../../..');

describe('src/data/fallback.json', () => {
	const parsed = parsePublicContent(fallback, { allowLocalImages: true });

	it('is a valid version 1 snapshot', () => {
		expect(parsed.ok).toBe(true);
	});

	it('only references image files that exist in the repo', () => {
		if (!parsed.ok) throw new Error(parsed.reason);
		const images = [
			...parsed.content.board.map((member) => member.photo),
			...parsed.content.events.flatMap((event) => event.photos),
			...parsed.content.pillars.flatMap((pillar) => (pillar.image ? [pillar.image] : [])),
		];
		for (const { url } of images) {
			if (url.startsWith('/src/')) expect(existsSync(resolve(root, url.slice(1))), url).toBe(true);
		}
	});

	it('holds real content only: no demo assets or placeholder photos', () => {
		expect(JSON.stringify(fallback)).not.toMatch(/assets\/demo|ejemplo|demo/i);
	});

	it('keeps the board to name, role and photo (S4)', () => {
		for (const member of fallback.board) expect(Object.keys(member).sort()).toEqual(['name', 'photo', 'role']);
	});

	it('leaves the site copy to the landing (settings null)', () => {
		expect(fallback.settings).toBeNull();
	});
});
