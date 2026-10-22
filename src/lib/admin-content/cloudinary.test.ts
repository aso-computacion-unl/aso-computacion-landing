import { describe, expect, it } from 'vitest';
import { deliveryUrl, remoteImageAttrs } from './cloudinary';

const BASE = 'https://res.cloudinary.com/demo/image/upload';
const URL = `${BASE}/v1/aso/photo.jpg`;

describe('deliveryUrl', () => {
	it('inserts the delivery transformation right after /image/upload/', () => {
		expect(deliveryUrl(URL, 720)).toBe(`${BASE}/f_auto,q_auto,c_limit,w_720/v1/aso/photo.jpg`);
	});

	it('only touches the first /image/upload/ segment', () => {
		const odd = `${BASE}/v1/image/upload/x.jpg`;
		expect(deliveryUrl(odd, 480)).toBe(`${BASE}/f_auto,q_auto,c_limit,w_480/v1/image/upload/x.jpg`);
	});

	it('leaves a URL without an image upload segment untouched', () => {
		expect(deliveryUrl('https://example.com/a.jpg', 480)).toBe('https://example.com/a.jpg');
	});
});

describe('remoteImageAttrs', () => {
	const photo = { src: URL, width: 1200, height: 800 };

	it('builds src (the widest candidate), srcset and the API width and height', () => {
		expect(remoteImageAttrs(photo, [480, 720, 960])).toEqual({
			src: `${BASE}/f_auto,q_auto,c_limit,w_960/v1/aso/photo.jpg`,
			srcset: [480, 720, 960].map((w) => `${BASE}/f_auto,q_auto,c_limit,w_${w}/v1/aso/photo.jpg ${w}w`).join(', '),
			width: 1200,
			height: 800,
		});
	});

	it('never advertises a width larger than the original (c_limit does not upscale)', () => {
		const small = remoteImageAttrs({ ...photo, width: 600, height: 400 }, [480, 720, 960]);
		expect(small.srcset).toBe(
			`${BASE}/f_auto,q_auto,c_limit,w_480/v1/aso/photo.jpg 480w, ${BASE}/f_auto,q_auto,c_limit,w_600/v1/aso/photo.jpg 600w`,
		);
		expect(small.src).toBe(`${BASE}/f_auto,q_auto,c_limit,w_600/v1/aso/photo.jpg`);
	});

	it('works with a single width', () => {
		const one = remoteImageAttrs(photo, [320]);
		expect(one.srcset).toBe(`${BASE}/f_auto,q_auto,c_limit,w_320/v1/aso/photo.jpg 320w`);
		expect(one.src).toBe(`${BASE}/f_auto,q_auto,c_limit,w_320/v1/aso/photo.jpg`);
	});
});
