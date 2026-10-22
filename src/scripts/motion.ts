// Scroll choreography (GSAP + ScrollTrigger, Lenis for smooth scroll). Transform and opacity only.
//   - Load: the isotype halves slide together and the `_` cursor blinks.
//   - Hero (desktop, tall viewports): pinned and scrubbed. The headline leaves line by line, the isotype grows to
//     fill the viewport and its cursor stretches down into the branch that continues as the Activities trunk.
//   - Page: rails draw with a travelling cursor, nodes pop, cards slide in, the README lights up word by word,
//     diff rows enter, numerals flip, board cards stagger up, the ribbon reacts to scroll velocity.
// Everything is visible without JS. The pre-motion state lives behind `html.motion` (set in Layout, removed
// when motion is reduced or this script fails), so reduced motion gets no pin and no movement at all.

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Cursor bar (underscore) of the isotype, in viewBox units: width and centre.
const CURSOR_W = 32.29;

const q = <T extends Element>(selector: string, scope: ParentNode = document) => scope.querySelector<T>(selector);
const qa = <T extends Element>(selector: string, scope: ParentNode = document) =>
	Array.from(scope.querySelectorAll<T>(selector));

async function init() {
	const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
		import('gsap'),
		import('gsap/ScrollTrigger'),
		import('lenis'),
	]);
	gsap.registerPlugin(ScrollTrigger);
	ScrollTrigger.config({ ignoreMobileResize: true });

	const lenis = new Lenis({ anchors: { offset: -72 } });
	lenis.on('scroll', ScrollTrigger.update);
	gsap.ticker.add((time) => lenis.raf(time * 1000));
	gsap.ticker.lagSmoothing(0);

	// Fire as soon as the element is past `start`, even if the page loads already scrolled beyond it.
	const reveal = (selector: string, start: string, onEnter: (batch: Element[]) => void) =>
		ScrollTrigger.batch(selector, { start, end: 'max', once: true, onEnter });

	/* ---------- Load: the isotype assembles, the cursor blinks ---------- */
	const svg = q<SVGElement>('.hero-mark-svg');
	if (svg) {
		const left = q('[data-mark-left]', svg);
		const right = q('[data-mark-right]', svg);
		const chev = q('[data-mark-chev]', svg);
		const cursor = q('[data-mark-cursor]', svg);
		gsap.set(left, { x: -56 });
		gsap.set(right, { x: 56 });
		gsap.set([chev, cursor], { opacity: 0 });
		gsap.set(svg, { visibility: 'visible' });
		const intro = gsap.timeline({ delay: 0.15 });
		intro
			.to([left, right], { x: 0, duration: 1.1, ease: 'expo.out' })
			.to(chev, { opacity: 1, duration: 0.3 }, 0.7)
			.to(cursor, { opacity: 1, duration: 0.01 }, 1.0)
			.to(cursor, { opacity: 0, duration: 0.01, repeat: 5, yoyo: true, repeatDelay: 0.38 }, 1.3);
	}

	/* ---------- Load: the hero git column draws ---------- */
	const heroRails = qa<HTMLElement>('[data-hero] [data-rail]');
	const heroItems = qa<HTMLElement>('[data-hero] li');
	if (heroRails.length) {
		const tl = gsap.timeline({ delay: 0.3, defaults: { ease: 'expo.out' } });
		heroRails.forEach((rail, i) => tl.fromTo(rail, { scaleY: 0 }, { scaleY: 1, duration: 1.4 }, i * 0.9));
		heroItems.forEach((item, i) => {
			const at = 0.15 + i * 0.35;
			tl.fromTo(q('[data-node]', item), { scale: 0 }, { scale: 1, duration: 0.6 }, at);
			tl.fromTo(q('[data-link]', item), { scaleX: 0 }, { scaleX: 1, duration: 0.6 }, at + 0.1);
		});
	}

	/* ---------- Ribbon: speed follows scroll velocity ---------- */
	const track = q<HTMLElement>('.ribbon-track');
	if (track) {
		const drift = gsap.to(track, { xPercent: -50, ease: 'none', duration: 48, repeat: -1 });
		let target = 1;
		let current = 1;
		ScrollTrigger.create({
			onUpdate: (self) => {
				target = 1 + Math.min(Math.abs(self.getVelocity()) / 180, 18);
			},
		});
		gsap.ticker.add(() => {
			target += (1 - target) * 0.04;
			current += (target - current) * 0.1;
			drift.timeScale(current);
		});
	}

	const mm = gsap.matchMedia();
	mm.add(
		{
			full: '(min-width: 768px)',
			lite: '(max-width: 767px)',
			pin: '(min-width: 1024px) and (min-height: 800px)',
		},
		(ctx) => {
			const { full, pin } = ctx.conditions as { full: boolean; lite: boolean; pin: boolean };

			/* ---------- Hero: pinned scroll moment ---------- */
			const hero = q<HTMLElement>('[data-hero]');
			const mark = q<HTMLElement>('[data-hero-mark]');
			const stem = q<HTMLElement>('[data-hero-stem]');
			const cue = q<HTMLElement>('[data-hero-cue]');
			const trunk = q<HTMLElement>('[data-trunk]');
			const cursor = q('[data-mark-cursor]');
			if (pin && hero && mark && stem && cue && trunk && cursor) {
				// Geometry of the moment: the isotype grows until its cursor sits on the Activities trunk.
				let g = { S: 1, k: 1, tx: 0, ty: 0, L0: 0, T0: 0 };
				const layout = () => {
					const H = hero.offsetHeight;
					const W = mark.offsetWidth;
					const k = W / 186;
					const S = (1.08 * H) / ((W * 209) / 186);
					const t = trunk.getBoundingClientRect();
					const railX = t.left + t.width / 2;
					const Yu = H * 0.58;
					const tx = railX - S * 119.63 * k;
					const ty = Yu - S * 123.62 * k;
					g = { S, k, tx, ty, L0: mark.offsetLeft, T0: mark.offsetTop };
					gsap.set(stem, { left: railX - 1.5, top: Yu, height: H - Yu });
					const cueLeft = Math.min(tx + S * W + 48, window.innerWidth - 200);
					gsap.set(cue, { left: cueLeft, top: Yu - 70, width: Math.min(544, window.innerWidth - cueLeft - 32) });
				};
				layout();
				ScrollTrigger.addEventListener('refreshInit', layout);

				const tl = gsap.timeline({
					scrollTrigger: {
						trigger: hero,
						start: 'top 64px',
						end: () => `+=${Math.round(window.innerHeight * 1.4)}`,
						pin: true,
						scrub: 0.7,
						anticipatePin: 1,
						invalidateOnRefresh: true,
					},
				});
				tl.to(qa('[data-hero-line]'), { xPercent: -140, opacity: 0, ease: 'power2.in', duration: 0.32, stagger: 0.07 }, 0)
					.to(qa('[data-hero-fade]'), { y: -30, opacity: 0, duration: 0.18 }, 0)
					.to(q('[data-hero-slab]'), { xPercent: 12, opacity: 0, duration: 0.3 }, 0.02)
					.to(
						mark,
						{
							x: () => g.tx - g.L0,
							y: () => g.ty - g.T0,
							scale: () => g.S,
							ease: 'power2.inOut',
							duration: 0.56,
						},
						0.12,
					)
					.to(
						cursor,
						{
							scaleX: () => 3 / (CURSOR_W * g.k * g.S),
							svgOrigin: '397.63 288.62',
							fill: '#2bb2e4',
							stroke: '#2bb2e4',
							duration: 0.1,
						},
						0.62,
					)
					.to(stem, { scaleY: 1, ease: 'none', duration: 0.3 }, 0.68)
					.fromTo(cue, { y: 24 }, { y: 0, opacity: 1, duration: 0.14 }, 0.84)
					.to({}, { duration: 0.02 }, 0.98);
			}

			/* ---------- Activities: rails draw, cursor travels, nodes pop, cards slide in ---------- */
			const graph = q('#actividades');
			if (graph) {
				qa<HTMLElement>('[data-rail-scrub]', graph).forEach((rail) => {
					const owner = rail.parentElement as HTMLElement;
					const cursorBar = q<HTMLElement>('[data-rail-cursor]', owner);
					gsap.fromTo(
						rail,
						{ scaleY: 0 },
						{
							scaleY: 1,
							ease: 'none',
							scrollTrigger: {
								trigger: owner,
								start: 'top 80%',
								end: 'bottom 72%',
								scrub: 0.3,
								onUpdate: cursorBar
									? (self) => {
											const length = rail.offsetHeight;
											gsap.set(cursorBar, {
												y: self.progress * length,
												opacity: self.progress > 0.002 && self.progress < 0.998 ? 1 : 0,
											});
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
						duration: full ? 0.8 : 0.6,
						ease: 'expo.out',
						stagger: 0.1,
					}),
				);

				// Sticky countdown: the digits roll in.
				const num = q<HTMLElement>('[data-count-num]', graph);
				if (num && num.textContent && !num.closest('[hidden]')) {
					const digits = Array.from(num.textContent).map((char) => {
						const span = document.createElement('span');
						span.textContent = char;
						span.style.display = 'inline-block';
						return span;
					});
					num.textContent = '';
					num.append(...digits);
					gsap.from(digits, {
						yPercent: 115,
						duration: 0.9,
						ease: 'expo.out',
						stagger: 0.12,
						scrollTrigger: { trigger: num, start: 'top 92%', once: true },
					});
				}
			}

			/* ---------- Nosotros: README lights up word by word, diff rows enter, numerals flip ---------- */
			const words = qa('[data-statement] .w');
			if (words.length && full) {
				gsap.to(words, {
					opacity: 1,
					ease: 'none',
					stagger: 0.12,
					scrollTrigger: { trigger: '[data-editor]', start: 'top 78%', end: 'bottom 52%', scrub: 0.6 },
				});
			}

			reveal('[data-diff-row]', 'top 90%', (batch) =>
				gsap.to(batch, { opacity: 1, x: 0, duration: 0.7, ease: 'expo.out', stagger: 0.14 }),
			);

			qa<HTMLElement>('[data-numeral]').forEach((el) => {
				const target = Number(el.dataset.numeral);
				gsap.set(el, { opacity: 0 });
				ScrollTrigger.create({
					trigger: el,
					start: 'top 90%',
					end: 'max',
					once: true,
					onEnter: () => {
						const counter = { value: 0 };
						el.textContent = '0';
						gsap.fromTo(
							el,
							{ rotationX: -90, opacity: 0, transformPerspective: 700, transformOrigin: '50% 100%' },
							{ rotationX: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.7)' },
						);
						gsap.to(counter, {
							value: target,
							duration: 0.7,
							ease: 'none',
							onUpdate: () => {
								el.textContent = String(Math.round(counter.value));
							},
							onComplete: () => {
								el.textContent = String(target);
							},
						});
					},
				});
			});

			/* ---------- Directiva: cards stagger up, large photos drift ---------- */
			reveal('[data-member]', 'top 92%', (batch) =>
				gsap.to(batch, {
					opacity: 1,
					y: 0,
					rotate: 0,
					duration: full ? 0.95 : 0.7,
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
		},
	);

	const refresh = () => ScrollTrigger.refresh();
	window.addEventListener('load', refresh);
	document.fonts?.ready.then(refresh);
	root.dataset.scrollTriggers = String(ScrollTrigger.getAll().length);
	root.dataset.motionReady = 'true';
}

if (reduced) {
	root.classList.remove('motion');
} else {
	init().catch(() => root.classList.remove('motion'));
}
