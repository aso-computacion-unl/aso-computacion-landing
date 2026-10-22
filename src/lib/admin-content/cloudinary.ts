// Remote photos are delivered by Cloudinary, never downloaded at build time: the page carries plain <img> tags whose
// URLs ask Cloudinary for a resized, re-encoded copy. Pure and unit-tested; the Photo component only spreads the result.

// f_auto picks AVIF/WebP/JPEG per browser, q_auto the quality, c_limit scales down to the width without cropping or
// upscaling (the visual crop stays in CSS: object-fit, as for bundled images).
const TRANSFORM = 'f_auto,q_auto,c_limit';
const UPLOAD = '/image/upload/';

// `.../image/upload/v1/a.jpg` -> `.../image/upload/f_auto,q_auto,c_limit,w_720/v1/a.jpg`
export const deliveryUrl = (url: string, width: number): string => {
	const at = url.indexOf(UPLOAD);
	if (at === -1) return url;
	const cut = at + UPLOAD.length;
	return `${url.slice(0, cut)}${TRANSFORM},w_${width}/${url.slice(cut)}`;
};

export interface RemoteImageAttrs {
	src: string;
	srcset: string;
	width: number;
	height: number;
}

// `widths` are the candidates the layout wants. They are capped at the original width, because c_limit never upscales
// and a "960w" descriptor on a 600 px file would lie. `src` (browsers without srcset) is the widest candidate.
export const remoteImageAttrs = (photo: { src: string; width: number; height: number }, widths: readonly number[]): RemoteImageAttrs => {
	const candidates = [...new Set(widths.map((width) => Math.min(width, photo.width)))].sort((a, b) => a - b);
	return {
		src: deliveryUrl(photo.src, candidates[candidates.length - 1]),
		srcset: candidates.map((width) => `${deliveryUrl(photo.src, width)} ${width}w`).join(', '),
		width: photo.width,
		height: photo.height,
	};
};
