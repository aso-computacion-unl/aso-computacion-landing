// Looping CSS animations (the blinking cursors, the live dots) only run while their block is on screen: off screen they
// are paused through `data-idle`, which the stylesheet reads. Without JS they simply keep looping, and under reduced
// motion there is nothing to pause.

const HOSTS = '.tk-list';

const hosts = Array.from(document.querySelectorAll<HTMLElement>(HOSTS));
if (hosts.length > 0) {
	const observer = new IntersectionObserver((entries) => {
		for (const entry of entries) entry.target.toggleAttribute('data-idle', !entry.isIntersecting);
	});
	hosts.forEach((host) => observer.observe(host));
}
