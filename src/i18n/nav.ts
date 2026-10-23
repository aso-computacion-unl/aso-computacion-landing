import { localizedPath, type Locale } from './locales';

// Where the header links of a page point. Nav hrefs are written for Spanish: page links get the page's locale, and
// section anchors only exist on the home page, so from any other page they point back to it.
export function navRouting(pathname: string, locale: Locale) {
	const homePath = localizedPath('/', locale);
	const onHome = pathname.replace(/\/$/, '') === homePath.replace(/\/$/, '');
	const pathFor = (href: string) => (href.startsWith('#') ? href : localizedPath(href, locale));
	const hrefFor = (href: string) => (href.startsWith('#') && !onHome ? `${homePath}${href}` : pathFor(href));
	const isCurrent = (href: string) => {
		if (href.startsWith('#')) return false;
		const path = pathFor(href);
		return pathname === path || pathname.startsWith(`${path}/`);
	};
	return { homePath, onHome, hrefFor, isCurrent };
}
