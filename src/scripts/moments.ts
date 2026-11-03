import { initDecrypt } from './decrypt';
import { initLanguages } from './languages';
import { initNetwork } from './network';

// Three small moments from the degree, one per section: networks (the hero), languages (Inscripciones) and hacking (the
// Novedades title). Loaded by ui.ts only on a page that has one. Under reduced motion each is its calm end state: the
// graph is drawn without packets, the snippet stays still and the title is already written.

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

const lang = document.querySelector<HTMLElement>('[data-lang]');
if (lang && !reduced) initLanguages(lang);

initDecrypt();
