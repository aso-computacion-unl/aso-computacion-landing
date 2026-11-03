import { describe, expect, it } from 'vitest';
import { makeRoute, placeNodes, pointAt, NODES, ROUTES, type Point } from './network';

describe('makeRoute / pointAt', () => {
	const route = makeRoute([
		[0, 0],
		[30, 40],
		[30, 100],
	]);

	it('measures the polyline: 50 for the diagonal leg plus 60 for the vertical one', () => {
		expect(route.length).toBe(110);
		expect(route.cumulative).toEqual([0, 50, 110]);
	});

	it('finds the point at a distance, inside a leg and across the corner', () => {
		expect(pointAt(route, 25)).toEqual([15, 20]);
		expect(pointAt(route, 50)).toEqual([30, 40]);
		expect(pointAt(route, 80)).toEqual([30, 70]);
	});

	it('clamps to the ends instead of leaving the route', () => {
		expect(pointAt(route, -10)).toEqual([0, 0]);
		expect(pointAt(route, 1000)).toEqual([30, 100]);
	});

	it('survives a repeated point (a leg of length zero) without producing NaN', () => {
		const odd = makeRoute([
			[0, 0],
			[0, 0],
			[10, 0],
		]);
		expect(odd.length).toBe(10);
		expect(pointAt(odd, 5)).toEqual([5, 0]);
		expect(pointAt(odd, 0).every(Number.isFinite)).toBe(true);
	});
});

describe('placeNodes', () => {
	const hosts: Point[] = [
		[200, 500],
		[700, 500],
		[1200, 500],
	];

	it('scales the fixed nodes to the box and puts the hosts where the shortcuts are', () => {
		const nodes = placeNodes(1000, 600, hosts);
		expect(nodes).toHaveLength(NODES.length);
		for (const [x, y] of nodes) {
			expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
		}
		const hostSlots = nodes.slice(-3);
		expect(hostSlots).toEqual(hosts);
		expect(nodes[0]).toEqual([NODES[0][0] * 1000, NODES[0][1] * 600]);
	});

	it('keeps the last slots free when fewer shortcuts exist: the unused hosts stay where the layout put them', () => {
		const nodes = placeNodes(1000, 600, hosts.slice(0, 2));
		expect(nodes.slice(-3, -1)).toEqual(hosts.slice(0, 2));
		expect(nodes.at(-1)).toEqual([NODES.at(-1)![0] * 1000, NODES.at(-1)![1] * 600]);
	});
});

describe('the layout', () => {
	it('has only routes made of existing nodes, each one starting at the root and ending on a host slot', () => {
		const hostStart = NODES.length - 3;
		ROUTES.forEach((route, index) => {
			expect(route.every((node) => node >= 0 && node < NODES.length)).toBe(true);
			expect(route[0]).toBe(0);
			expect(route.at(-1)).toBe(hostStart + index);
		});
	});
});
