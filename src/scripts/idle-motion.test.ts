import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The module runs when it is imported, against the page's document: stand-ins for the document and the observer, and a
// fresh import each time.
function host() {
	const attributes = new Set<string>();
	return {
		attributes,
		toggleAttribute: (name: string, force: boolean) => (force ? attributes.add(name) : attributes.delete(name)),
	};
}

async function load(hosts: ReturnType<typeof host>[]) {
	const observed: unknown[] = [];
	let notify: (entries: unknown[]) => void = () => {};
	vi.stubGlobal('document', { querySelectorAll: vi.fn(() => hosts) });
	vi.stubGlobal(
		'IntersectionObserver',
		class {
			constructor(callback: (entries: unknown[]) => void) {
				notify = callback;
			}
			observe = (target: unknown) => observed.push(target);
		},
	);
	// The script has no exports, so TypeScript does not treat it as a module: import it by a variable name.
	const script = './idle-motion';
	await import(/* @vite-ignore */ script);
	return { observed, notify: (entries: unknown[]) => notify(entries) };
}

describe('idle-motion', () => {
	beforeEach(() => vi.resetModules());
	afterEach(() => vi.unstubAllGlobals());

	it('watches every ticket list', async () => {
		const hosts = [host(), host()];
		const { observed } = await load(hosts);
		expect(observed).toEqual(hosts);
	});

	it('pauses a list that leaves the screen and resumes it on return', async () => {
		const list = host();
		const { notify } = await load([list]);
		notify([{ target: list, isIntersecting: false }]);
		expect(list.attributes.has('data-idle')).toBe(true);
		notify([{ target: list, isIntersecting: true }]);
		expect(list.attributes.has('data-idle')).toBe(false);
	});

	it('does not create an observer on a page without lists', async () => {
		const { observed } = await load([]);
		expect(observed).toEqual([]);
	});
});
