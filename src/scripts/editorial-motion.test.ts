import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initEditorial, type EditorialKit } from './editorial-motion';

// The editorial layer against a fake document and a recording stand-in for GSAP: the tests run in Node, without a browser.
const HERO_LINES = ['.hero .hero-line'];

function kitWith(overrides: Partial<EditorialKit> = {}) {
	const heroLines = [{ textContent: 'Entérate de', closest: () => null }];
	vi.stubGlobal('document', {
		fonts: undefined,
		documentElement: { classList: { remove: vi.fn() } },
		querySelector: () => null,
		querySelectorAll: (selector: string) => (selector === HERO_LINES[0] ? heroLines : []),
		addEventListener: vi.fn(),
	});
	const timeline: { to: () => typeof timeline } = { to: () => timeline };
	const gsap = { set: vi.fn(), to: vi.fn(), from: vi.fn(), fromTo: vi.fn(), timeline: () => timeline };
	const reveal = vi.fn();
	const kit = {
		gsap,
		ScrollTrigger: { create: vi.fn() },
		SplitText: null,
		plan: { gsap: true, lenis: false, magnetic: false },
		reveal,
		late: false,
		...overrides,
	} as unknown as EditorialKit;
	return { kit, gsap, reveal, heroLines };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const revealed = (reveal: ReturnType<typeof vi.fn>) => reveal.mock.calls.map(([selector]) => selector);

describe('initEditorial', () => {
	beforeEach(() => vi.useRealTimers());
	afterEach(() => vi.unstubAllGlobals());

	it('plays the hero intro and the scroll entrances on a normal start', async () => {
		const { kit, gsap, reveal, heroLines } = kitWith();
		initEditorial(kit);
		await settle();
		expect(gsap.set).toHaveBeenCalledWith(heroLines, { visibility: 'visible' });
		expect(gsap.to).toHaveBeenCalledWith(
			['.hero .hero-lede', '.hero .gates li'],
			expect.objectContaining({ opacity: 1 }),
		);
		expect(revealed(reveal)).toEqual(expect.arrayContaining(['.tk-item', '.news-list > li', '.forum-app']));
	});

	it('leaves the hero alone on a late start but still sets up the other moments', async () => {
		const { kit, gsap, reveal, heroLines } = kitWith({ late: true });
		initEditorial(kit);
		await settle();
		// The page was revealed already: the headline, lede and shortcuts must not be hidden again or restarted.
		expect(gsap.set).not.toHaveBeenCalledWith(heroLines, expect.anything());
		expect(gsap.to).not.toHaveBeenCalledWith(['.hero .hero-lede', '.hero .gates li'], expect.anything());
		expect(revealed(reveal)).toEqual(expect.arrayContaining(['.tk-item', '.news-list > li', '.forum-app']));
	});
});
