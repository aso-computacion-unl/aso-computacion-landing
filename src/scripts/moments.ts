import { initDecrypt } from './decrypt';
import { initNetwork } from './network';

// Two small moments from the degree, one per section: networks (the hero) and hacking (the Novedades title). Loaded by
// ui.ts only on a page that has one. Under reduced motion each is its calm end state: the graph is drawn without
// packets and the title is already written.

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const net = document.querySelector<HTMLElement>('[data-net]');
const gates = Array.from(document.querySelectorAll<HTMLElement>('[data-net-name]'));
if (net && gates.length > 0) {
	// Only where the graph is shown (the CSS hides it below this width).
	const wide = window.matchMedia('(min-width: 1180px)');
	const start = () => initNetwork(net, gates, reduced);
	if (wide.matches) start();
	else wide.addEventListener('change', (event) => event.matches && start(), { once: true });
}

initDecrypt();
