// One orchestrated effect: the branch is drawn as you scroll and each node settles when the line reaches it.
// Everything is visible without JS; the pre-motion state lives behind `html.motion` (set in Layout).

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

async function init() {
	const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
		import('gsap'),
		import('gsap/ScrollTrigger'),
		import('lenis'),
	]);
	gsap.registerPlugin(ScrollTrigger);

	const lenis = new Lenis({ anchors: { offset: -72 } });
	lenis.on('scroll', ScrollTrigger.update);
	gsap.ticker.add((time) => lenis.raf(time * 1000));
	gsap.ticker.lagSmoothing(0);

	// Hero preview: the planned (dashed) rail draws first, then the solid one; nodes settle as the line passes.
	const heroRails = gsap.utils.toArray<HTMLElement>('[data-hero] [data-rail]');
	const heroItems = gsap.utils.toArray<HTMLElement>('[data-hero] li');
	if (heroRails.length) {
		const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
		heroRails.forEach((rail, i) => tl.fromTo(rail, { scaleY: 0 }, { scaleY: 1, duration: 1.4 }, i * 0.9));
		heroItems.forEach((item, i) => {
			const at = 0.15 + i * 0.35;
			tl.fromTo(item.querySelector('[data-node]'), { scale: 0 }, { scale: 1, duration: 0.6 }, at);
			tl.fromTo(item.querySelector('[data-link]'), { scaleX: 0 }, { scaleX: 1, duration: 0.6 }, at + 0.1);
		});
	}

	// Activity graph: rails scrub with the scroll, nodes/links/bends play once when they enter.
	const graph = document.querySelector('#actividades');
	if (graph) {
		graph.querySelectorAll<HTMLElement>('[data-rail-scrub]').forEach((rail) => {
			gsap.fromTo(
				rail,
				{ scaleY: 0 },
				{
					scaleY: 1,
					ease: 'none',
					scrollTrigger: {
						trigger: rail.parentElement,
						start: 'top 70%',
						end: 'bottom 70%',
						scrub: true,
					},
				},
			);
		});

		const enter = (selector: string, from: gsap.TweenVars, to: gsap.TweenVars) =>
			ScrollTrigger.batch(graph.querySelectorAll(selector), {
				start: 'top 80%',
				once: true,
				onEnter: (batch) => gsap.fromTo(batch, from, { ...to, ease: 'expo.out', stagger: 0.08 }),
			});

		enter('[data-node]', { scale: 0 }, { scale: 1, duration: 0.6 });
		enter('[data-link]', { scaleX: 0 }, { scaleX: 1, duration: 0.6 });
		enter('[data-bend]', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9 });
	}

	window.addEventListener('load', () => ScrollTrigger.refresh());
	root.dataset.motionReady = 'true';
}

if (reduced) {
	root.classList.remove('motion');
} else {
	init().catch(() => root.classList.remove('motion'));
}
