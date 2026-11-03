// RSS feed of the news, one per language. The mapping is pure; src/views/newsFeed.ts feeds it with the resolved content.
import { localizedPath, type Locale } from '../../i18n/locales';
import type { NewsItem } from '../admin-content/model';
import { NEWS_PATH } from '../admin-content/news';
import { canonicalUrl } from './meta';

// Where the feed is served, and what the layout's <link rel="alternate"> points at.
export const newsFeedPath = (locale: Locale): string => localizedPath(`${NEWS_PATH}/rss.xml`, locale);

// `news` is already newest first; `date` is YYYY-MM-DD, read as UTC midnight so the day never shifts with the build's
// time zone.
export const toRssItems = (news: readonly NewsItem[], site: URL) =>
	news.map((item) => ({
		title: item.title,
		description: item.summary,
		link: canonicalUrl(site, item.href),
		pubDate: new Date(`${item.date}T00:00:00Z`),
	}));
