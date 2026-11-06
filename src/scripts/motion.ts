// Scroll choreography (GSAP + ScrollTrigger, Lenis for smooth scroll). Transform and opacity only.
//   - Actividades opener: the isotype assembles when it comes into view; then, over a tall run with a CSS-sticky stage
//     (no JS pin, so touch scrolling stays native and the address bar cannot make it jump), the title leaves, the isotype
//     grows to fill the stage, its brackets slide off and the `_` cursor thins into a stem that lands on the trunk below
//     and splits into the two sides. The isotype stays on top of the stem as the root commit.
//   - Page: rails draw with a travelling cursor, nodes pop, cards slide in,
//     the Nosotros manifesto rises line by line while one word rotates, bento tiles and join reasons rise, the
//     collage rows slide against each other, board cards stagger up, the ribbon reacts to scroll velocity.
//   - Editorial layer (editorial-motion.ts): the hero letters rise while the round logo rolls in and its isotype outline
//     draws itself, headings rise word by word, tickets are dealt in, news and the forum window enter, buttons lean toward
//     a fine pointer, and the footer logo turns once as the page ends.
// Everything is visible without JS. The pre-motion state lives behind `html.motion` (set in Layout, removed
// when motion is reduced or this script fails), so reduced motion gets no sticky run and no movement at all.
// Loading: GSAP and ScrollTrigger are fetched after the first paint, once the browser is idle, and never under reduced
// motion; Lenis only where a mouse is the main input (see motion-policy.ts); SplitText (letters and words) rides along in
// the same fetch and is optional: without it the text just shows.

import type { gsap } from 'gsap';
import { initEditorial } from './editorial-motion';
import { planMotion, readMotionEnv, type MotionPlan } from './motion-policy';

const root = document.documentElement;

// Cursor bar (underscore) of the isotype, in viewBox units: width and centre.
const CURSOR_W = 32.29;

// Geometry of the isotype moment, measured in layout() and read lazily by the tweens (so refreshes re-measure it).
// `txEnd` is only set in portrait, where the whole mark also slides sideways until its cursor sits on the trunk.
interface MomentGeo {
	S: number;
	k: number;
	tx: number;
	txEnd: number | null;
	ty: number;
	L0: number;
	T0: number;
	vw: number;
}

interface MomentParts {
	mark: HTMLElement;
	cursor: Element;
	markLeft: Element;
	markRight: Element;
	markChev: Element | null;
	markOutline: Element | null;
	stem: HTMLElement;
	cue: HTMLElement;
}

// The part of the moment both layouts share, from the isotype growing to the cue appearing (timeline units).
const momentSequence = (tl: gsap.core.Timeline, p: MomentParts, g: MomentGeo) => {
	const clear = () => (g.vw * 1.15) / (g.S * g.k);
	tl.to(
		p.mark,
		{ x: () => g.tx - g.L0, y: () => g.ty - g.T0, scale: () => g.S, ease: 'power2.inOut', duration: 0.46 },
		0.1,
	)
		.to(p.markOutline, { opacity: 0, duration: 0.08 }, 0.5)
		.to(p.markChev, { opacity: 0, duration: 0.06 }, 0.58)
		.to(p.markLeft, { x: () => -clear(), ease: 'power3.in', duration: 0.22 }, 0.6)
		.to(p.markRight, { x: () => clear(), ease: 'power3.in', duration: 0.22 }, 0.6);
	if (g.txEnd !== null) {
		tl.to(p.mark, { x: () => (g.txEnd ?? g.tx) - g.L0, ease: 'power3.inOut', duration: 0.24 }, 0.6);
	}
	tl.to(
		p.cursor,
		{
			scaleX: () => 3 / (CURSOR_W * g.k * g.S),
			svgOrigin: '397.63 288.62',
			fill: '#2bb2e4',
			stroke: '#2bb2e4',
			duration: 0.08,
		},
		0.84,
	)
		.to(p.stem, { scaleY: 1, ease: 'none', duration: 0.26 }, 0.9)
		// Once the stem has grown past the bar, the stem alone carries the line (no sub-pixel fringe).
		.set(p.cursor, { opacity: 0 }, 0.98)
		.fromTo(p.cue, { y: 24 }, { y: 0, opacity: 1, duration: 0.12 }, 1.0)
		.to({}, { duration: 0.02 }, 1.16);
};

const q = <T extends Element>(selector: string, scope: ParentNode = document) => scope.querySelector<T>(selector);
const qa = <T extends Element>(selector: string, scope: ParentNode = document) =>
	Array.from(scope.querySelectorAll<T>(selector));

async function init(plan: MotionPlan) {
	const [{ gsap }, { ScrollTrigger }, lenisModule, SplitText] = await Promise.all([
		import('gsap'),
		import('gsap/ScrollTrigger'),
		plan.lenis ? import('lenis') : null,
		import('gsap/SplitText').then(
			(module) => module.SplitText,
			() => null,
		),
	]);
	// Layout.astro reveals the page after three seconds without motion. A start after that still runs every moment, but the
	// hero intro must not hide the revealed headline again (see `late` in editorial-motion.ts).
	const late = !root.classList.contains('motion');
	gsap.registerPlugin(ScrollTrigger);
	if (SplitText) gsap.registerPlugin(SplitText);
	ScrollTrigger.config({ ignoreMobileResize: true });

	if (lenisModule) {
		const lenis = new lenisModule.default({ anchors: { offset: -72 } });
		lenis.on('scroll', ScrollTrigger.update);
		gsap.ticker.add((time) => lenis.raf(time * 1000));
	}
	gsap.ticker.lagSmoothing(0);

	// Fire as soon as the element is past `start`, even if the page loads already scrolled beyond it.
	const reveal = (selector: string, start: string, onEnter: (batch: Element[]) => void) =>
		ScrollTrigger.batch(selector, { start, end: 'max', once: true, onEnter });

	/* ---------- Opener: the isotype assembles when Actividades comes into view, then the cursor blinks ---------- */
	const svg = q<SVGElement>('.hero-mark-svg');
	let intro: gsap.core.Timeline | undefined;
	if (svg) {
		const left = q('[data-mark-left]', svg);
		const right = q('[data-mark-right]', svg);
		const chev = q('[data-mark-chev]', svg);
		const cursor = q('[data-mark-cursor]', svg);
		gsap.set(left, { x: -56 });
		gsap.set(right, { x: 56 });
		gsap.set([chev, cursor], { opacity: 0 });
		gsap.set(svg, { visibility: 'visible' });
		intro = gsap
			.timeline({ paused: true })
			.to([left, right], { x: 0, duration: 1.1, ease: 'expo.out' })
			.to(chev, { opacity: 1, duration: 0.3 }, 0.7)
			.to(cursor, { opacity: 1, duration: 0.01 }, 1.0)
			.to(cursor, { opacity: 0, duration: 0.01, repeat: 5, yoyo: true, repeatDelay: 0.38 }, 1.3);
		ScrollTrigger.create({
			trigger: '[data-opener]',
			start: 'top 85%',
			once: true,
			onEnter: () => void intro?.play(),
		});
	}

	/* ---------- Ribbon: speed follows scroll velocity, and it only runs while it is on screen ---------- */
	const track = q<HTMLElement>('.ribbon-track');
	const ribbon = q<HTMLElement>('.ribbon');
	if (track && ribbon) {
		const drift = gsap.to(track, { xPercent: -50, ease: 'none', duration: 48, repeat: -1, paused: true });
		let target = 1;
		let current = 1;
		const follow = () => {
			target += (1 - target) * 0.04;
			current += (target - current) * 0.1;
			drift.timeScale(current);
		};
		ScrollTrigger.create({
			onUpdate: (self) => {
				target = 1 + Math.min(Math.abs(self.getVelocity()) / 180, 18);
			},
		});
		const run = (on: boolean) => {
			if (on) {
				drift.play();
				gsap.ticker.add(follow);
			} else {
				drift.pause();
				gsap.ticker.remove(follow);
			}
		};
		const onScreen = ScrollTrigger.create({
			trigger: ribbon,
			start: 'top bottom',
			end: 'bottom top',
			onToggle: (self) => run(self.isActive),
		});
		run(onScreen.isActive);
	}

	const mm = gsap.matchMedia();
	mm.add(
		{
			full: '(min-width: 768px)',
			phone: '(max-width: 767px)',
		},
		(ctx) => {
			const { full, phone } = ctx.conditions as { full: boolean; phone: boolean };

			/* ---------- Opener: scroll moment over a sticky stage ---------- */
			const run = q<HTMLElement>('[data-opener]');
			const stage = q<HTMLElement>('[data-opener-stage]');
			const head = q<HTMLElement>('[data-opener-head]');
			const mark = q<HTMLElement>('[data-opener-mark]');
			const stem = q<HTMLElement>('[data-opener-stem]');
			const cue = q<HTMLElement>('[data-opener-cue]');
			const emblem = q<HTMLElement>('[data-opener-emblem]');
			const trunk = q<HTMLElement>('[data-trunk]');
			const cursor = q('[data-mark-cursor]');
			const markLeft = q('[data-mark-left]');
			const markRight = q('[data-mark-right]');
			const markChev = q('[data-mark-chev]');
			const markOutline = q('[data-mark-outline]');
			const cleanups: Array<() => void> = [];
			// Order of the moment: the title leaves, the isotype grows to fill the stage, its brackets slide off to both
			// sides, and only then does the `_` cursor thin into the stem. The stem is never drawn across the bracket
			// shapes, and the trunk it lands on stays hidden until the stem reaches it.
			const BAR_H = 10.32; // cursor bar height in viewBox units
			const geo: MomentGeo = { S: 1, k: 1, tx: 0, txEnd: null, ty: 0, L0: 0, T0: 0, vw: 0 };

			if (run && stage && head && mark && stem && cue && emblem && trunk && cursor && markLeft && markRight) {
				const headerH = () => q<HTMLElement>('header')?.offsetHeight ?? 65;
				const layout = () => {
					const H = stage.offsetHeight;
					const W = stage.offsetWidth;
					const w0 = mark.offsetWidth;
					const k = w0 / 186;
					const t = trunk.getBoundingClientRect();
					const landX = t.left + t.width / 2 - stage.getBoundingClientRect().left;
					// Portrait: the mark fills the width, then slides sideways until its cursor sits on the trunk. Landscape:
					// it fills the height and grows straight onto the trunk.
					const S = phone ? (0.92 * W) / w0 : (1.08 * H) / ((w0 * 209) / 186);
					const growX = phone ? W / 2 : landX;
					const Yu = H * (phone ? 0.5 : 0.6);
					Object.assign(geo, {
						S,
						k,
						tx: growX - S * 119.63 * k,
						txEnd: phone && Math.abs(landX - growX) > 1 ? landX - S * 119.63 * k : null,
						ty: Yu - S * 123.62 * k,
						L0: mark.offsetLeft,
						T0: mark.offsetTop,
						vw: W,
					});
					// The stem starts at the top edge of the thinned cursor bar, so the bar is the start of the line.
					const stemTop = Yu - (BAR_H / 2) * S * k;
					gsap.set(stem, { left: landX - 1.5, top: stemTop, height: H - stemTop });
					gsap.set(emblem, { left: landX, top: stemTop, xPercent: -50, yPercent: -100, transformOrigin: '50% 100%' });
					const cueLeft = phone ? landX + 22 : Math.max(20, landX + 40);
					gsap.set(cue, {
						left: cueLeft,
						top: Yu + (phone ? -38 : -70),
						width: Math.max(180, phone ? W - cueLeft - 20 : Math.min(544, W - landX - 80)),
					});
				};
				layout();
				ScrollTrigger.addEventListener('refreshInit', layout);
				cleanups.push(() => ScrollTrigger.removeEventListener('refreshInit', layout));

				// Start and end are measured from the top of the screen and the fixed stage height, never from the window
				// height, so the browser bars showing or hiding cannot move them.
				let trunkOn = false;
				gsap.set(trunk, { scaleY: 0 });
				const forks = qa('[data-fork]:not(.sp-bus)');
				const bus = qa('.sp-bus');
				const tl = gsap.timeline({
					scrollTrigger: {
						trigger: run,
						start: () => `top ${headerH()}px`,
						end: () => `bottom ${headerH() + stage.offsetHeight}px`,
						scrub: 0.6,
						invalidateOnRefresh: true,
						onUpdate: (self) => {
							// A scroll that skips the intro lets it finish at once, so it cannot fight the scrubbed tweens.
							if (self.progress > 0 && intro?.isActive()) intro.progress(1);
							const done = self.progress > 0.995;
							if (done === trunkOn) return;
							trunkOn = done;
							// The trunk grows once the stem has landed, then the two lanes open from it.
							gsap.to(trunk, {
								scaleY: done ? 1 : 0,
								duration: done ? 0.7 : 0.25,
								ease: done ? 'expo.out' : 'power2.in',
								overwrite: true,
							});
							gsap.to(forks, {
								opacity: done ? 1 : 0,
								duration: done ? 0.6 : 0.2,
								delay: done ? 0.5 : 0,
								overwrite: true,
							});
							gsap.to(bus, {
								scaleX: done ? 1 : 0,
								opacity: done ? 1 : 0,
								duration: done ? 0.8 : 0.2,
								delay: done ? 0.5 : 0,
								ease: 'expo.out',
								overwrite: true,
							});
						},
					},
				});
				gsap.set(bus, { scaleX: 0 });
				// The title clears quickly: the isotype grows into the space it leaves.
				tl.to(head, { y: -80, opacity: 0, ease: 'power2.in', duration: 0.3 }, 0);
				momentSequence(tl, { mark, cursor, markLeft, markRight, markChev, markOutline, stem, cue }, geo);
				tl.fromTo(emblem, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, ease: 'expo.out', duration: 0.14 }, 1.0);
			}

			/* ---------- Activities: rails draw, cursor travels, nodes pop, cards slide in ---------- */
			const graph = q('#actividades');
			if (graph) {
				qa<HTMLElement>('[data-rail-scrub]', graph).forEach((rail) => {
					const owner = rail.parentElement as HTMLElement;
					const cursorBar = q<HTMLElement>('[data-rail-cursor]', owner);
					// The history rail ends on the root node, so its scrub must end when that node arrives, not the graph bottom.
					const endNode = q<HTMLElement>('[data-root-node]', owner);
					const hideCursor = () => cursorBar && gsap.set(cursorBar, { opacity: 0 });
					gsap.fromTo(
						rail,
						{ scaleY: 0 },
						{
							scaleY: 1,
							ease: 'none',
							scrollTrigger: {
								trigger: owner,
								start: 'top 80%',
								endTrigger: endNode ?? owner,
								end: endNode ? 'center 75%' : 'bottom 70%',
								scrub: true,
								onLeave: hideCursor,
								onLeaveBack: hideCursor,
								onUpdate: cursorBar
									? (self) => {
											// The rail ends exactly on the root node; the cursor never goes past it.
											const live = self.progress > 0.004 && self.progress < 0.985;
											gsap.set(cursorBar, { y: self.progress * rail.offsetHeight, opacity: live ? 1 : 0 });
										}
									: undefined,
							},
						},
					);
				});

				reveal('#actividades [data-node]', 'top 88%', (batch) =>
					gsap.fromTo(batch, { scale: 0 }, { scale: 1, duration: 0.7, ease: 'back.out(2.6)', stagger: 0.08 }),
				);
				reveal('#actividades [data-link]', 'top 88%', (batch) =>
					gsap.fromTo(batch, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'expo.out', stagger: 0.08 }),
				);
				reveal('#actividades [data-bend]', 'top 88%', (batch) =>
					gsap.fromTo(batch, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: 'expo.out' }),
				);
				reveal('#actividades [data-card]', 'top 90%', (batch) =>
					gsap.to(batch, {
						opacity: 1,
						x: 0,
						y: 0,
						duration: 0.8,
						ease: 'expo.out',
						stagger: 0.1,
					}),
				);
			}

			/* ---------- Nosotros: manifesto rises line by line (scrubbed), the word rotates, tiles rise ---------- */
			const manifesto = q('[data-manifesto]');
			if (manifesto) {
				const lines = qa('[data-m-in]', manifesto);
				gsap.fromTo(
					lines,
					{ yPercent: 105, y: 0 },
					{
						yPercent: 0,
						y: 0,
						ease: 'none',
						stagger: 0.35,
						scrollTrigger: { trigger: manifesto, start: 'top 88%', end: 'center 55%', scrub: true },
					},
				);

				const words = qa('.rotor-word', manifesto);
				if (words.length > 1) {
					gsap.set(words.slice(1), { yPercent: 110, y: 0 });
					const cycle = gsap.timeline({ repeat: -1, paused: true });
					words.forEach((word, i) => {
						const next = words[(i + 1) % words.length];
						cycle
							.to(word, { yPercent: -110, duration: 0.75, ease: 'expo.inOut' }, '+=1.5')
							.fromTo(next, { yPercent: 110 }, { yPercent: 0, duration: 0.75, ease: 'expo.inOut' }, '<');
					});
					ScrollTrigger.create({
						trigger: manifesto,
						start: 'top 95%',
						end: 'bottom 5%',
						onToggle: (self) => (self.isActive ? cycle.play() : cycle.pause()),
					});
				}
			}

			reveal('[data-tile]', 'top 92%', (batch) =>
				gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.14 }),
			);

			// The tile words drift against the scroll; on a phone the travel is halved so they stay inside the column.
			const drift = full ? 36 : 18;
			qa<HTMLElement>('[data-word]').forEach((word) => {
				gsap.fromTo(
					word,
					{ x: drift },
					{
						x: -drift,
						ease: 'none',
						scrollTrigger: { trigger: word, start: 'top bottom', end: 'bottom top', scrub: true },
					},
				);
			});

			/* ---------- Directiva: cards stagger up, large photos drift ---------- */
			reveal('[data-member]', 'top 92%', (batch) =>
				gsap.to(batch, {
					opacity: 1,
					y: 0,
					rotate: 0,
					duration: 0.95,
					ease: 'expo.out',
					stagger: 0.09,
				}),
			);

			if (full) {
				qa<HTMLElement>('.member-lg .portrait img').forEach((img) => {
					gsap.fromTo(
						img,
						{ yPercent: -6, scale: 1.16 },
						{
							yPercent: 6,
							scale: 1.16,
							ease: 'none',
							scrollTrigger: { trigger: img.closest('.member'), start: 'top bottom', end: 'bottom top', scrub: true },
						},
					);
				});
			}

			/* ---------- Join: headline rises, collage rows slide against each other, stickers pop, reasons rise ---------- */
			reveal('[data-j-in]', 'top 92%', (batch) =>
				gsap.to(batch, { yPercent: 0, y: 0, duration: 1, ease: 'expo.out', stagger: 0.12 }),
			);

			qa<HTMLElement>('[data-c-row]').forEach((row) => {
				const toLeft = row.dataset.cRow === 'left';
				const shift = () => Math.min(row.scrollWidth * 0.2, window.innerWidth * 0.35);
				gsap.fromTo(
					row,
					{ x: () => (toLeft ? 0 : -shift()) },
					{
						x: () => (toLeft ? -shift() : 0),
						ease: 'none',
						scrollTrigger: {
							trigger: '[data-collage]',
							start: 'top bottom',
							end: 'bottom top',
							scrub: true,
							invalidateOnRefresh: true,
						},
					},
				);
			});

			reveal('[data-pop]', 'top 92%', (batch) =>
				gsap.to(batch, { scale: 1, duration: 0.7, ease: 'back.out(2.8)', stagger: 0.15 }),
			);

			reveal('[data-reason]', 'top 92%', (batch) =>
				gsap.to(batch, { opacity: 1, y: 0, duration: 0.85, ease: 'expo.out', stagger: 0.12 }),
			);

			/* ---------- Forum: the three steps rise in turn ---------- */
			reveal('[data-step]', 'top 92%', (batch) =>
				gsap.to(batch, { opacity: 1, y: 0, duration: 0.85, ease: 'expo.out', stagger: 0.12 }),
			);

			return () => cleanups.forEach((off) => off());
		},
	);

	initEditorial({ gsap, ScrollTrigger, SplitText, plan, reveal, late });

	const refresh = () => ScrollTrigger.refresh();
	window.addEventListener('load', refresh);
	// An event card's registration form opens and closes, which moves everything below it.
	window.addEventListener('aso:relayout', refresh);
	document.fonts?.ready.then(refresh, () => {}); // A font that fails to load keeps the fallback; nothing to redo.
	root.dataset.scrollTriggers = String(ScrollTrigger.getAll().length);
	root.dataset.motionReady = 'true';
}

// After the first paint, when the main thread is idle (a second at most; Safari has no idle callback).
const whenIdle = (run: () => void) =>
	'requestIdleCallback' in window ? window.requestIdleCallback(run, { timeout: 1000 }) : setTimeout(run, 200);

const plan = planMotion(readMotionEnv((query) => window.matchMedia(query)));
if (plan.gsap) {
	whenIdle(() => init(plan).catch(() => root.classList.remove('motion')));
} else {
	root.classList.remove('motion');
}
