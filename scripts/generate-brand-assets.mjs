// Generates the raster brand assets under public/ from the vector sources in src/assets/brand/.
// Run `pnpm assets:brand` after changing the brand files and commit the PNGs it writes.
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const brand = (name) => fileURLToPath(new URL(`../src/assets/brand/${name}`, import.meta.url));
const out = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url));

// Same navy as the theme-color meta in src/layouts/Layout.astro.
const NAVY = '#053066';

// The logo scaled to `height`, as a PNG buffer with a transparent background.
const logo = (file, height) => sharp(brand(file), { density: 300 }).resize({ height }).png().toBuffer();

async function shareImage() {
	await sharp({ create: { width: 1200, height: 630, channels: 3, background: NAVY } })
		.composite([{ input: await logo('logo-white-sky.svg', 470), gravity: 'center' }])
		.png({ compressionLevel: 9 })
		.toFile(out('og-default.png'));
}

await shareImage();
