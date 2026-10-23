// The landing's two languages. Spanish is the default and lives at the root; English lives under /en/. Only the
// landing's own copy is translated: content from the admin stays as it was written.
export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';

// BCP 47 tag for Intl and <html lang>.
export const htmlLang: Record<Locale, string> = { es: 'es', en: 'en' };

export function toLocale(value: string | undefined): Locale {
	return (locales as readonly string[]).includes(value ?? '') ? (value as Locale) : defaultLocale;
}

const EN_PREFIX = /^\/en(?=\/|$)/;

// A site path (starting with "/") written for Spanish, as seen in `locale`. In-page anchors and absolute URLs pass
// through untouched.
export function localizedPath(path: string, locale: Locale): string {
	if (!path.startsWith('/') || locale === defaultLocale) return path;
	return path === '/' ? '/en/' : `/en${path}`;
}

// The current page (a pathname of either locale) in `target`.
export function alternatePath(pathname: string, target: Locale): string {
	const base = pathname.replace(EN_PREFIX, '') || '/';
	return localizedPath(base, target);
}
