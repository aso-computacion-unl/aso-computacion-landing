// What motion code a visitor's device gets. Pure: motion.ts reads the media queries and acts on the plan.
//   - Reduced motion: nothing is loaded (no GSAP, no ScrollTrigger, no Lenis); the page is static.
//   - Otherwise GSAP + ScrollTrigger run the scroll choreography on every device.
//   - Lenis (smooth scroll) only where a mouse is the main input; touch scrolling stays native.

export const MOTION_QUERIES = {
	reducedMotion: '(prefers-reduced-motion: reduce)',
	finePointer: '(pointer: fine)',
	hoverCapable: '(hover: hover)',
} as const;

export interface MotionEnv {
	reducedMotion: boolean;
	finePointer: boolean;
	hoverCapable: boolean;
}

export interface MotionPlan {
	gsap: boolean;
	lenis: boolean;
}

export function planMotion({ reducedMotion, finePointer, hoverCapable }: MotionEnv): MotionPlan {
	if (reducedMotion) return { gsap: false, lenis: false };
	return { gsap: true, lenis: finePointer && hoverCapable };
}

export function readMotionEnv(match: (query: string) => { matches: boolean }): MotionEnv {
	return {
		reducedMotion: match(MOTION_QUERIES.reducedMotion).matches,
		finePointer: match(MOTION_QUERIES.finePointer).matches,
		hoverCapable: match(MOTION_QUERIES.hoverCapable).matches,
	};
}
