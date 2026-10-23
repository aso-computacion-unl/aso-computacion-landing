// News -> what the home section and the /novedades pages render. Pure, like the rest of the mapping.
import { toPhoto, type MapContext } from './map';
import type { NewsItem } from './model';
import { formatStamp } from './timeline';
import { localizedPath } from '../../i18n/locales';
import type { PublicNewsItem } from './types';

// The home shows this many; /novedades shows all.
export const HOME_NEWS_COUNT = 3;

export const NEWS_PATH = '/novedades';

export const newsPath = (slug: string): string => `${NEWS_PATH}/${slug}`;

// Newest `publishedAt` first. The sort is stable, so items published the same day keep the API order.
export const toNews = (news: readonly PublicNewsItem[], ctx: MapContext): NewsItem[] =>
	[...news]
		.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
		.map((item) => ({
			slug: item.slug,
			href: localizedPath(newsPath(item.slug), ctx.locale ?? 'es'),
			title: item.title,
			summary: item.summary,
			body: item.body,
			date: item.publishedAt,
			stamp: formatStamp(item.publishedAt, 'day', ctx.locale),
			...(item.cover ? { cover: toPhoto(item.cover, ctx) } : {}),
		}));

export const latestNews = (news: readonly NewsItem[]): NewsItem[] => news.slice(0, HOME_NEWS_COUNT);
