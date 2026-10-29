// The live feed of the forum section (`$ tail -f foro`): example lines that scroll in one by one. The server renders
// every line; the oldest one is moved to the end every couple of seconds, and the list is anchored to its bottom, so the
// newest line always shows and the older ones leave through the top. It runs only while the feed is on screen and the tab
// is visible, and never under reduced motion, where the lines stay as they were drawn.

const INTERVAL_MS = 2200;

export function initForumFeed(feed: HTMLElement): void {
	if (feed.children.length < 2) return;
	let timer = 0;
	let visible = false;

	const tick = () => {
		const first = feed.firstElementChild;
		if (!first) return;
		first.classList.add('is-new');
		feed.append(first);
		// The animation only needs to run once per arrival.
		first.addEventListener('animationend', () => first.classList.remove('is-new'), { once: true });
	};

	const sync = () => {
		const run = visible && !document.hidden;
		if (run && !timer) timer = window.setInterval(tick, INTERVAL_MS);
		if (!run && timer) {
			window.clearInterval(timer);
			timer = 0;
		}
	};

	new IntersectionObserver((entries) => {
		visible = entries.some((entry) => entry.isIntersecting);
		sync();
	}).observe(feed);
	document.addEventListener('visibilitychange', sync);
}
