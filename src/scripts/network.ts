// The "networks" moment of the hero (wide screens only): a faint graph of nodes behind the shortcuts, where echo requests
// leave a root node, travel the edges to the node above each shortcut and come back as replies, with a `$ ping` readout.
// The geometry is pure so it can be tested; `initNetwork` draws it into the hero's `[data-net]` and runs the packets while
// the hero is on screen. Decoration only: aria-hidden, no information lives here.

export type Point = readonly [number, number];

export interface Route {
	points: readonly Point[];
	// Distance travelled up to each point.
	cumulative: number[];
	length: number;
}

export function makeRoute(points: readonly Point[]): Route {
	const cumulative = [0];
	for (let index = 1; index < points.length; index += 1) {
		const [ax, ay] = points[index - 1];
		const [bx, by] = points[index];
		cumulative.push(cumulative[index - 1] + Math.hypot(bx - ax, by - ay));
	}
	return { points, cumulative, length: cumulative[cumulative.length - 1] };
}

// The point `distance` along the route, clamped to its ends.
export function pointAt(route: Route, distance: number): Point {
	const { points, cumulative, length } = route;
	const s = Math.max(0, Math.min(length, distance));
	let leg = 1;
	while (leg < cumulative.length - 1 && cumulative[leg] < s) leg += 1;
	const [ax, ay] = points[leg - 1];
	const [bx, by] = points[leg];
	const span = cumulative[leg] - cumulative[leg - 1];
	const t = span === 0 ? 0 : (s - cumulative[leg - 1]) / span;
	return [ax + (bx - ax) * t, ay + (by - ay) * t];
}

// Nodes in a unit box: a cluster on each side of the headline, the root above it, and three slots for the shortcuts (the
// last three), which are replaced by where the shortcuts really are.
export const NODES: readonly Point[] = [
	[0.5, 0.04], // 0 root
	[0.06, 0.12], // 1
	[0.15, 0.3], // 2
	[0.04, 0.46], // 3
	[0.2, 0.52], // 4
	[0.1, 0.68], // 5
	[0.94, 0.12], // 6
	[0.85, 0.3], // 7
	[0.96, 0.46], // 8
	[0.8, 0.52], // 9
	[0.9, 0.68], // 10
	[0.32, 0.8], // 11
	[0.68, 0.8], // 12
	[0.18, 0.86], // 13 host: first shortcut
	[0.5, 0.86], // 14 host: second shortcut
	[0.82, 0.86], // 15 host: third shortcut
];

export const EDGES: readonly (readonly [number, number])[] = [
	[0, 1],
	[0, 6],
	[1, 2],
	[1, 3],
	[2, 4],
	[3, 4],
	[3, 5],
	[4, 5],
	[6, 7],
	[6, 8],
	[7, 9],
	[8, 9],
	[8, 10],
	[9, 10],
	[4, 11],
	[5, 13],
	[11, 13],
	[11, 14],
	[12, 14],
	[9, 12],
	[10, 15],
	[12, 15],
];

// One route per shortcut, from the root: index i ends on host slot i.
export const ROUTES: readonly (readonly number[])[] = [
	[0, 1, 2, 4, 11, 13],
	[0, 1, 2, 4, 11, 14],
	[0, 6, 7, 9, 12, 15],
];

const HOSTS = 3;

// The nodes in pixels for a box of `width` x `height`, the shortcut slots taking the given points.
export function placeNodes(width: number, height: number, hosts: readonly Point[]): Point[] {
	const nodes = NODES.map(([x, y]): Point => [x * width, y * height]);
	hosts.slice(0, HOSTS).forEach((point, index) => {
		nodes[NODES.length - HOSTS + index] = point;
	});
	return nodes;
}

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (name: string, attrs: Record<string, string>) => {
	const element = document.createElementNS(NS, name);
	for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
	return element;
};

// Draws the graph into `host` (the hero's `[data-net]`) from the shortcuts' positions, and runs the packets while it is
// visible. Redraws when the hero changes size. Returns nothing: the hero owns it for the life of the page.
export function initNetwork(host: HTMLElement, gates: HTMLElement[], reduced: boolean): void {
	const readout = host.querySelector<HTMLElement>('[data-net-say]');
	let stopFrames = () => {};

	const draw = () => {
		stopFrames();
		host.querySelector('svg')?.remove();
		const box = host.getBoundingClientRect();
		if (box.width === 0 || box.height === 0 || gates.length === 0) return;
		const hostPoints = gates.map((gate): Point => {
			const rect = gate.getBoundingClientRect();
			return [rect.left + rect.width / 2 - box.left, rect.top - box.top - 18];
		});
		const nodes = placeNodes(box.width, box.height, hostPoints);
		const svg = svgEl('svg', { viewBox: `0 0 ${box.width} ${box.height}`, focusable: 'false' });
		svg.append(
			svgEl('path', {
				class: 'net-edge',
				d: EDGES.map(([a, b]) => `M${nodes[a][0]} ${nodes[a][1]}L${nodes[b][0]} ${nodes[b][1]}`).join(''),
			}),
		);
		const rings: SVGElement[] = [];
		nodes.forEach(([x, y], index) => {
			const size = index === 0 ? 12 : index >= NODES.length - HOSTS ? 10 : 8;
			const attrs = { x: String(x - size / 2), y: String(y - size / 2), width: String(size), height: String(size) };
			svg.append(svgEl('rect', { ...attrs, class: index === 0 ? 'net-node net-root' : 'net-node' }));
			const ring = svgEl('rect', { ...attrs, class: 'net-ring' });
			rings.push(ring);
			svg.append(ring);
		});
		const layer = svgEl('g', {});
		svg.append(layer);
		host.prepend(svg);
		if (reduced) return;

		const routes = gates.map((gate, index) => ({
			route: makeRoute(ROUTES[index].map((node) => nodes[node])),
			ids: ROUTES[index],
			name: gate.dataset.netName ?? '',
		}));
		let running = false;
		let visible = false;
		let raf = 0;
		let last = 0;
		let nextAt = 0;
		let previous = -1;
		type Packet = { index: number; s: number; dir: 1 | -1; els: SVGElement[]; done: boolean };
		let packets: Packet[] = [];

		const place = (packet: Packet) => {
			packet.els.forEach((el, trail) => {
				const [x, y] = pointAt(routes[packet.index].route, packet.s - packet.dir * trail * 9);
				el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
			});
		};
		const ping = (node: number) =>
			rings[node]?.animate(
				[
					{ opacity: 0.9, transform: 'scale(1)' },
					{ opacity: 0, transform: 'scale(3.4)' },
				],
				{ duration: 900, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
			);
		const launch = () => {
			let pick: number;
			do pick = Math.floor(Math.random() * routes.length);
			while (pick === previous && routes.length > 1);
			previous = pick;
			const els = [1, 0.5, 0.25, 0.1].map((opacity) => {
				const el = svgEl('rect', {
					class: 'net-packet',
					width: '6',
					height: '6',
					x: '-3',
					y: '-3',
					opacity: String(opacity),
				});
				layer.append(el);
				return el;
			});
			const packet: Packet = { index: pick, s: 0, dir: 1, els, done: false };
			packets.push(packet);
			place(packet);
		};
		const speed = (length: number) => length / Math.min(3.2, Math.max(1.3, length / 220));

		const frame = (time: number) => {
			raf = 0;
			if (!running) return;
			const dt = Math.min(0.05, (time - (last || time)) / 1000);
			last = time;
			for (const packet of packets) {
				const { route, ids, name } = routes[packet.index];
				packet.s += packet.dir * speed(route.length) * dt;
				if (packet.dir > 0 && packet.s >= route.length) {
					packet.s = route.length;
					packet.dir = -1;
					ping(ids[ids.length - 1]);
					if (readout) readout.textContent = `64 bytes de ${name}: tiempo=${8 + Math.floor(Math.random() * 12)} ms`;
					packet.els.forEach((el) => el.classList.add('is-back'));
				} else if (packet.dir < 0 && packet.s <= 0) {
					packet.done = true;
					ping(0);
				}
				place(packet);
			}
			packets = packets.filter((packet) => {
				if (packet.done) packet.els.forEach((el) => el.remove());
				return !packet.done;
			});
			if (time >= nextAt && packets.length < 2) {
				launch();
				nextAt = time + 1500 + Math.random() * 900;
			}
			raf = requestAnimationFrame(frame);
		};
		const sync = () => {
			running = visible && !document.hidden;
			if (running && !raf) {
				last = 0;
				raf = requestAnimationFrame(frame);
			}
		};
		const observer = new IntersectionObserver((entries) => {
			visible = entries.some((entry) => entry.isIntersecting);
			sync();
		});
		observer.observe(host);
		document.addEventListener('visibilitychange', sync);
		stopFrames = () => {
			running = false;
			observer.disconnect();
			document.removeEventListener('visibilitychange', sync);
			if (raf) cancelAnimationFrame(raf);
		};
	};

	draw();
	let width = host.offsetWidth;
	new ResizeObserver(() => {
		if (host.offsetWidth === width) return;
		width = host.offsetWidth;
		draw();
	}).observe(host);
}
