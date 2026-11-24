import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initEditorial, type EditorialKit } from './editorial-motion';

// The editorial layer against a fake document and a recording stand-in for GSAP: the tests run in Node, without a browser.
const HERO_LINES = ['.hero .hero-line'];

// The hero headline as the page has it: an h1 with a visually hidden prefix and the lines that SplitText splits.
function heading() {
	const attributes = new Map<string, string>();
	const title = {
		attributes,
		setAttribute: (name: string, value: string) => attributes.set(name, value),
		querySelector: (selector: string) => (selector === '.sr-only' ? { textContent: 'ASO Computación: ' } : null),
	};
	const lines = ['Entérate de', 'todo lo que', 'pasa'].map((textContent) => ({
		textContent,
		closest: (selector: string) => (selector === 'h1' ? title : null),
	}));
	return { title, lines };
}

function splitText() {
	const create = vi.fn((_targets: unknown, _options: Record<string, unknown>) => ({ chars: ['char'] }));
	return { create };
}

function kitWith(
	overrides: Partial<EditorialKit> = {},
	heroLines: unknown[] = [{ textContent: 'Entérate de', closest: () => null }],
) {
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

	it('names the split headline on the h1 and hides the split lines from assistive technology', async () => {
		const { title, lines } = heading();
		const SplitText = splitText();
		const { kit } = kitWith({ SplitText: SplitText as unknown as EditorialKit['SplitText'] }, lines);
		initEditorial(kit);
		await settle();
		expect(title.attributes.get('aria-label')).toBe('ASO Computación: Entérate de todo lo que pasa');
		expect(SplitText.create).toHaveBeenCalledTimes(1);
		expect(SplitText.create.mock.calls[0][0]).toEqual(lines);
		expect(SplitText.create.mock.calls[0][1]).toEqual(expect.objectContaining({ aria: 'hidden' }));
	});

	it('keeps SplitText labelling the lines when the headline has no h1 to carry the name', async () => {
		const SplitText = splitText();
		const { kit } = kitWith({ SplitText: SplitText as unknown as EditorialKit['SplitText'] });
		initEditorial(kit);
		await settle();
		expect(SplitText.create.mock.calls[0][1]).toEqual(expect.objectContaining({ aria: 'auto' }));
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
