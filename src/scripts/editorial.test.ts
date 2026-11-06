import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEAL_TILTS, dealTilt, magnetOffset } from './editorial';
import { ISOTYPE_LEFT, ISOTYPE_RIGHT, ISOTYPE_VIEWBOX } from './editorial-isotype';

describe('dealTilt', () => {
	it('alternates the tilt of the cards dealt in, repeating after each set', () => {
		expect(DEAL_TILTS.map((_, index) => dealTilt(index))).toEqual(DEAL_TILTS);
		expect(dealTilt(DEAL_TILTS.length)).toBe(DEAL_TILTS[0]);
		expect(dealTilt(DEAL_TILTS.length * 3 + 1)).toBe(DEAL_TILTS[1]);
	});

	it('keeps neighbours on opposite sides and the tilt small enough to read as a card, not a spin', () => {
		expect(Math.sign(dealTilt(0))).not.toBe(Math.sign(dealTilt(1)));
		for (const tilt of DEAL_TILTS) expect(Math.abs(tilt)).toBeLessThanOrEqual(4);
	});
});

describe('magnetOffset', () => {
	const box = { left: 100, top: 50, width: 200, height: 60 };

	it('is zero with the pointer at the centre of the button', () => {
		expect(magnetOffset(box, { x: 200, y: 80 })).toEqual({ x: 0, y: 0 });
	});

	it('pulls a fraction of the distance to the centre, less horizontally than the button is wide', () => {
		const pulled = magnetOffset(box, { x: 300, y: 110 });
		expect(pulled.x).toBeCloseTo(12);
		expect(pulled.y).toBeCloseTo(6);
	});

	it('pulls the other way on the other side of the centre', () => {
		const pulled = magnetOffset(box, { x: 100, y: 50 });
		expect(pulled.x).toBeCloseTo(-12);
		expect(pulled.y).toBeCloseTo(-6);
	});

	it('never moves a button further than a fraction of its own size', () => {
		const far = magnetOffset(box, { x: 5000, y: 5000 });
		expect(far.x).toBeLessThanOrEqual(box.width * 0.12);
		expect(far.y).toBeLessThanOrEqual(box.height * 0.2);
	});
});

describe('the isotype outline', () => {
	const official = readFileSync(new URL('../assets/brand/isotype-white.svg', import.meta.url), 'utf8');

	it('uses the official geometry: both parts appear unchanged in the brand isotype', () => {
		expect(official).toContain(`d="${ISOTYPE_LEFT}"`);
		expect(official).toContain(`d="${ISOTYPE_RIGHT}"`);
	});

	it('is framed by the same viewBox the opener mark uses', () => {
		expect(ISOTYPE_VIEWBOX).toBe('278 165 186 209');
		expect(official).toContain(`viewBox="${ISOTYPE_VIEWBOX}"`);
	});
});
