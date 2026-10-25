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

// The white isotype on a navy square: app and tab icons, and the logo the structured data points at. The isotype takes `fill` of
// the side, which leaves the margin launchers and tab bars expect.
async function icon(name, size, fill = 0.62) {
	await sharp({ create: { width: size, height: size, channels: 3, background: NAVY } })
		.composite([{ input: await logo('isotype-white.svg', Math.round(size * fill)), gravity: 'center' }])
		.png({ compressionLevel: 9 })
		.toFile(out(name));
}

await shareImage();
await icon('icon-512.png', 512);
await icon('icon-192.png', 192);
await icon('apple-touch-icon.png', 180);
// Small sizes get a bigger isotype: the margin would eat it.
await icon('favicon-32.png', 32, 0.78);
