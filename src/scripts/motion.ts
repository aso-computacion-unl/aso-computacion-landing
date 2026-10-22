// Scroll choreography (GSAP + ScrollTrigger, Lenis for smooth scroll). Transform and opacity only.
//   - Load: the isotype halves slide together and the `_` cursor blinks.
//   - Hero (desktop, tall viewports): pinned and scrubbed. The headline leaves line by line, the isotype grows to
//     fill the viewport and its cursor stretches down into the branch that continues as the Activities trunk.
//   - Page: rails draw with a travelling cursor, nodes pop, cards slide in, the about sentence lights up word by word,
//     the Nosotros manifesto rises line by line while one word rotates, bento tiles and join reasons rise, the
//     collage rows slide against each other, board cards stagger up, the ribbon reacts to scroll velocity.
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

			const sentence = qa('[data-statement] .w');
			if (sentence.length && full) {
				gsap.to(sentence, {
					opacity: 1,
					ease: 'none',
					stagger: 0.12,
					scrollTrigger: { trigger: '[data-statement]', start: 'top 85%', end: 'bottom 50%', scrub: 0.4 },
				});
			}

			reveal('[data-tile]', 'top 92%', (batch) =>
				gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.14 }),
			);

			if (full) {
				qa<HTMLElement>('[data-outline]').forEach((word) => {
					gsap.fromTo(
						word,
						{ x: 36 },
						{ x: -36, ease: 'none', scrollTrigger: { trigger: word, start: 'top bottom', end: 'bottom top', scrub: true } },
					);
				});
			}

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
