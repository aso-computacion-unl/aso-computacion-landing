// News terminal of the home (components/News.astro): pointing at or focusing a `git log` row shows its `git show` pane.
// The rows stay plain links to the posts, so a click or tap still opens the post. Without JS the newest pane shows.

// Sets up the visor inside `root` (the `[data-news-visor]` block). Does nothing when rows and panes do not pair up.
export function initNewsVisor(root: HTMLElement): void {
	const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-news-row]'));
	const shows = Array.from(root.querySelectorAll<HTMLElement>('[data-news-show]'));
	if (rows.length === 0 || rows.length !== shows.length) return;

	const select = (index: number) => {
		rows.forEach((row, i) => row.setAttribute('data-active', String(i === index)));
		shows.forEach((show, i) => {
			show.hidden = i !== index;
		});
	};

	rows.forEach((row, index) => {
		row.addEventListener('pointerenter', () => select(index));
		row.addEventListener('focus', () => select(index));
	});
}
