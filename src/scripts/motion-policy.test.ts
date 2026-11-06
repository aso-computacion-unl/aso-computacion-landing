import { describe, expect, it } from 'vitest';
import { MOTION_QUERIES, planMotion, readMotionEnv, type MotionEnv } from './motion-policy';

const env = (overrides: Partial<MotionEnv> = {}): MotionEnv => ({
	reducedMotion: false,
	finePointer: true,
	hoverCapable: true,
	...overrides,
});

describe('planMotion', () => {
	it('loads GSAP and Lenis on a desktop with a mouse', () => {
		expect(planMotion(env())).toEqual({ gsap: true, lenis: true, magnetic: true });
	});

	it('loads nothing when the visitor asks for reduced motion, whatever the device', () => {
		expect(planMotion(env({ reducedMotion: true }))).toEqual({ gsap: false, lenis: false, magnetic: false });
		expect(planMotion(env({ reducedMotion: true, finePointer: false, hoverCapable: false }))).toEqual({
			gsap: false,
			lenis: false,
			magnetic: false,
		});
	});

	it('keeps the animations but not the smooth scroll on a touch screen', () => {
		expect(planMotion(env({ finePointer: false, hoverCapable: false }))).toEqual({
			gsap: true,
			lenis: false,
			magnetic: false,
		});
	});

	it('needs both a fine pointer and hover for the smooth scroll', () => {
		expect(planMotion(env({ finePointer: false }))).toEqual({ gsap: true, lenis: false, magnetic: false });
		expect(planMotion(env({ hoverCapable: false })).lenis).toBe(false);
	});

	it('pulls buttons toward a fine pointer, with or without hover, and never toward a finger', () => {
		expect(planMotion(env({ hoverCapable: false })).magnetic).toBe(true);
		expect(planMotion(env({ finePointer: false })).magnetic).toBe(false);
	});
});

describe('MOTION_QUERIES', () => {
	it('names the media features the plan reads', () => {
		expect(MOTION_QUERIES).toEqual({
			reducedMotion: '(prefers-reduced-motion: reduce)',
			finePointer: '(pointer: fine)',
			hoverCapable: '(hover: hover)',
		});
	});
});

describe('readMotionEnv', () => {
	it('asks the browser each query and reports the answers', () => {
		const asked: string[] = [];
		const result = readMotionEnv((query) => {
			asked.push(query);
			return { matches: query === MOTION_QUERIES.finePointer };
		});
		expect(result).toEqual({ reducedMotion: false, finePointer: true, hoverCapable: false });
		expect(asked).toEqual(Object.values(MOTION_QUERIES));
	});
});
