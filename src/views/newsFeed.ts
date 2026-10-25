// The RSS feed of the news in one language, shared by src/pages/novedades/rss.xml.ts and src/pages/en/novedades/rss.xml.ts.
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getContent } from '../data/content';
import { htmlLang, type Locale } from '../i18n/locales';
import { useTranslations } from '../i18n/ui';
import { toRssItems } from '../lib/seo/rss';

export function newsFeed(context: APIContext, locale: Locale) {
	const t = useTranslations(locale);
	const { news, site } = getContent(locale);
	return rss({
		title: `${t('news.title')} · ${site.name}`,
		description: t('news.pageDescription', { name: site.name }),
		site: context.site ?? context.url.origin,
		items: toRssItems(news, context.site ?? new URL(context.url.origin)),
		customData: `<language>${htmlLang[locale]}</language>`,
	});
}
