// The editorial layer of the choreography, started by motion.ts once GSAP is loaded: the hero rises letter by letter while
// the round logo rolls in and the isotype outline draws itself behind it, section headings rise word by word, tickets are
// dealt in, news and the forum window enter, buttons lean toward a fine pointer, and the footer logo makes one full turn
// that ends exactly at the bottom of the page. Transform, opacity and stroke offsets only.
// The pre-motion state of everything here lives behind `html.motion` in global.css, so a failure on the way (the
// `motion` class is removed) leaves the page complete, and reduced motion never gets this far.

import type { gsap } from 'gsap';
import type { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { SplitText } from 'gsap/SplitText';
import { dealTilt, magnetOffset } from './editorial';
import type { MotionPlan } from './motion-policy';

export interface EditorialKit {
	gsap: typeof gsap;
	ScrollTrigger: typeof ScrollTrigger;
	// Null when the SplitText chunk did not load: the text then simply shows, without the word and letter motion.
	SplitText: typeof SplitText | null;
	plan: MotionPlan;
	// Runs `onEnter` once for the elements matching `selector` as they pass `start` (see motion.ts).
	reveal: (selector: string, start: string, onEnter: (batch: Element[]) => void) => void;
}

const q = <T extends Element>(selector: string, scope: ParentNode = document) => scope.querySelector<T>(selector);
const qa = <T extends Element>(selector: string, scope: ParentNode = document) =>
	Array.from(scope.querySelectorAll<T>(selector));

// Letters and words rise out of a clip; the CSS gives those clips room for descenders (`.split-char-mask`, `.split-word-mask`).
const RISE = 135;

async function heroIntro({ gsap, SplitText }: EditorialKit) {
	// The headline waits for its font (a second at most), so the letters rise at their final size.
	await Promise.race([document.fonts?.ready, new Promise((resolve) => setTimeout(resolve, 900))]);
	const lines = qa('.hero .hero-line');
	if (SplitText && lines.length > 0) {
		const split = SplitText.create(lines, { type: 'chars', mask: 'chars', charsClass: 'split-char', smartWrap: true });
		gsap.set(split.chars, { yPercent: RISE });
		gsap.set(lines, { visibility: 'visible' });
		gsap.to(split.chars, { yPercent: 0, duration: 1.2, stagger: 0.018, ease: 'expo.out', delay: 0.15 });
	} else {
		gsap.set(lines, { visibility: 'visible' });
	}
	gsap.to(['.hero .hero-lede', '.hero .gates li'], {
		opacity: 1,
		y: 0,
		duration: 1,
		stagger: 0.08,
		ease: 'expo.out',
		delay: 0.7,
	});
}

function heroLogo({ gsap, ScrollTrigger }: EditorialKit) {
	const marks = qa('.hero-logo-mark');
	const ghost = qa('.hero-logo .iso-ghost');
	// The logo rolls in; the outline behind it draws itself, one part after the other.
	gsap.to(marks, { opacity: 1, rotate: 0, scale: 1, duration: 1.6, ease: 'expo.out', delay: 0.3 });
	gsap.to(qa('.hero-logo .iso-ghost path'), {
		strokeDashoffset: 0,
		duration: 2.2,
		ease: 'expo.inOut',
		stagger: 0.25,
		delay: 0.4,
	});
	// Then the logo floats and the outline breathes, for as long as the hero is on screen.
	const idle = gsap.timeline({ paused: true });
	idle
		.to(marks, { y: -10, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0)
		.to(ghost, { rotate: 6, scale: 1.04, duration: 5, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
	const hero = q('.hero');
	if (!hero) return;
	const run = (on: boolean) => (on ? idle.play() : idle.pause());
	const onScreen = ScrollTrigger.create({
		trigger: hero,
		start: 'top bottom',
		end: 'bottom top',
		onToggle: (self) => run(self.isActive),
	});
	run(onScreen.isActive);
}

// Section headings (not the Actividades opener, which has its own moment, nor the Novedades title, which decrypts).
function headings({ gsap, SplitText }: EditorialKit) {
	if (!SplitText) return;
	qa('main .h2-xl')
		.filter((heading) => heading.id !== 'actividades-title' && !q('[data-decrypt]', heading))
		.forEach((heading) => {
			const split = SplitText.create(heading, { type: 'words', mask: 'words', wordsClass: 'split-word' });
			gsap.from(split.words, {
				yPercent: RISE,
				duration: 1.1,
				stagger: 0.07,
				ease: 'expo.out',
				scrollTrigger: { trigger: heading, start: 'top 88%', once: true },
			});
		});
}

function entrances({ gsap, reveal }: EditorialKit) {
	reveal('.tk-item', 'top 90%', (batch) =>
		gsap.fromTo(
			batch,
			{ y: 90, rotate: (index: number) => dealTilt(index), opacity: 0 },
			{ y: 0, rotate: 0, opacity: 1, duration: 1.1, stagger: 0.12, ease: 'expo.out' },
		),
	);
	reveal('.news-list > li', 'top 92%', (batch) =>
		gsap.fromTo(batch, { x: -60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9, stagger: 0.1, ease: 'expo.out' }),
	);
	reveal('.forum-app', 'top 85%', (batch) =>
		gsap.fromTo(
			batch,
			{ y: 80, rotate: -1.5, opacity: 0 },
			{ y: 0, rotate: 0, opacity: 1, duration: 1.2, ease: 'expo.out' },
		),
	);
}

// The footer logo turns once as the footer scrolls in and finishes upright exactly when the page ends (the trigger ends at
// the footer's bottom meeting the window's bottom); the wordmark slides in alongside.
function footer({ gsap }: EditorialKit) {
	const brand = q('[data-foot-brand]');
	const trigger = brand?.closest('footer');
	if (!brand || !trigger) return;
	const scrollTrigger = { trigger, start: 'top bottom', end: 'bottom bottom', scrub: true };
	gsap.fromTo('[data-foot-logo]', { rotate: -360, scale: 0.4 }, { rotate: 0, scale: 1, ease: 'none', scrollTrigger });
	gsap.fromTo(
		'[data-foot-word]',
		{ xPercent: 20, opacity: 0 },
		{ xPercent: 0, opacity: 1, ease: 'none', scrollTrigger },
	);
}

// Buttons lean toward a fine pointer. One listener for all of them, so buttons added later (the forum's) lean too.
function magnets({ gsap }: EditorialKit) {
	const pulls = new WeakMap<Element, { x: (value: number) => void; y: (value: number) => void }>();
	const pullOf = (button: Element) => {
		let pull = pulls.get(button);
		if (!pull) {
			const ease = 'elastic.out(1,.45)';
			pull = {
				x: gsap.quickTo(button, 'x', { duration: 0.5, ease }),
				y: gsap.quickTo(button, 'y', { duration: 0.5, ease }),
			};
			pulls.set(button, pull);
		}
		return pull;
	};
	const buttonOf = (event: Event) => (event.target instanceof Element ? event.target.closest('.btn') : null);
	document.addEventListener('pointermove', (event) => {
		const button = buttonOf(event);
		if (!button || event.pointerType === 'touch') return;
		const offset = magnetOffset(button.getBoundingClientRect(), { x: event.clientX, y: event.clientY });
		const pull = pullOf(button);
		pull.x(offset.x);
		pull.y(offset.y);
	});
	document.addEventListener('pointerout', (event) => {
		const button = buttonOf(event);
		if (!button || (event.relatedTarget instanceof Node && button.contains(event.relatedTarget))) return;
		const pull = pulls.get(button);
		pull?.x(0);
		pull?.y(0);
	});
}

export function initEditorial(kit: EditorialKit) {
	// If the intro fails halfway, the page falls back to its complete static state, as when motion itself fails.
	void heroIntro(kit).catch(() => document.documentElement.classList.remove('motion'));
	heroLogo(kit);
	headings(kit);
	entrances(kit);
	footer(kit);
	if (kit.plan.magnetic) magnets(kit);
}
