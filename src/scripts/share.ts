import { shareMode } from '../lib/share';

// Share controls of a news post (components/ShareBar.astro). The three links are plain anchors that work without JS;
// this upgrades them: the browser's share sheet when there is one, otherwise the links plus a copy button. The words
// it writes (copied / failed) come from the page in data attributes, already in the page's language.
const root = document.querySelector<HTMLElement>('[data-share]');
const url = root?.dataset.url;
const title = root?.dataset.title;
const links = root?.querySelector<HTMLElement>('[data-share-links]');
const nativeButton = root?.querySelector<HTMLButtonElement>('[data-share-native]');
const copyButton = root?.querySelector<HTMLButtonElement>('[data-share-copy]');
const status = root?.querySelector<HTMLElement>('[data-share-status]');

if (root && url && title && links && nativeButton && copyButton && status) {
	const mode = shareMode({
		canShare: typeof navigator.share === 'function' && (navigator.canShare?.({ url }) ?? true),
		canCopy: typeof navigator.clipboard?.writeText === 'function',
	});
	links.hidden = !mode.links;
	nativeButton.hidden = !mode.native;
	copyButton.hidden = !mode.copy;

	// The live region is emptied first so announcing the same message twice still reads out.
	let clear: ReturnType<typeof setTimeout> | undefined;
	const say = (message: string | undefined) => {
		clearTimeout(clear);
		status.textContent = '';
		requestAnimationFrame(() => {
			status.textContent = message ?? '';
			clear = setTimeout(() => (status.textContent = ''), 5000);
		});
	};

	nativeButton.addEventListener('click', () => {
		// Dismissing the sheet rejects with AbortError: not an error worth showing.
		navigator.share({ title, url }).catch(() => {});
	});

	copyButton.addEventListener('click', () => {
		navigator.clipboard.writeText(url).then(
			() => say(root.dataset.copied),
			() => say(root.dataset.failed),
		);
	});
}
