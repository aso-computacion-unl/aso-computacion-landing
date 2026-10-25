// The landing's fixed UI words in both languages. Content from the admin is not here: it stays as it was written.
// `en` must have every key of `es` (the type checks it, ui.test.ts checks the placeholders). To add a word: add the key
// to `es`, then to `en`, and read it with `useTranslations(locale)`. {placeholders} are filled by `t(key, { name })`.
import type { Locale } from './locales';

const es = {
	skip: 'Saltar al contenido',
	'nav.label': 'Principal',
	'nav.home': '{name}, inicio',
	'lang.switchText': 'EN',
	'lang.switchLabel': 'English version',
	'theme.toggle': 'Modo oscuro',
	newTab: '(se abre en otra pestaña)',
	'demo.title': 'Contenido de ejemplo',
	'demo.detail': 'Dato de ejemplo',
	soon: 'próximamente',

	'hero.activities': 'Ver actividades',
	'hero.instagram': 'Síguenos en Instagram',

	'activities.title': 'Actividades',
	'activities.aside': 'Próxima actividad y filtros',
	'activities.intro':
		'Arriba, lo que viene (línea punteada: todavía no ocurre). Abajo, lo que ya hicimos, hasta el primer día.',
	'activities.next': 'Próxima actividad',
	'activities.date': 'fecha',
	'activities.branch': 'Actividades de {title}',
	'count.is': 'es',
	'count.one': 'falta',
	'count.many': 'faltan',
	'count.today': 'hoy',
	'count.dayOne': 'día',
	'count.dayMany': 'días',
	'filters.label': 'Filtrar actividades por tipo',
	'filters.all': 'todo',
	'filters.status': '{type}: {shown} de {total}',
	'type.taller': 'taller',
	'type.charla': 'charla',
	'type.evento': 'evento',
	'type.comunidad': 'comunidad',
	'legend.label': 'Leyenda',
	'legend.next': 'próximo',
	'legend.planned': 'línea punteada: planeado',
	'legend.past': 'pasado',
	'legend.branch': 'rama: evento con varias actividades',
	'legend.head': 'HEAD: hoy',
	'commit.upcoming': '(por venir)',
	'commit.new': '¡nuevo!',
	'meta.hora': 'hora',
	'meta.lugar': 'lugar',
	'meta.para': 'para',

	'news.title': 'Novedades',
	'news.lead': 'Lo último que anunciamos: avisos, resultados y noticias para quienes estudian Computación.',
	'news.seeAll': 'Ver todas las novedades',
	'news.seeCount': 'Ver las {count} novedades',
	'news.pageDescription':
		'Avisos, resultados y noticias de {name}, la asociación de estudiantes de Computación de la UNL.',
	'news.pageLead': 'Todo lo que hemos anunciado, de lo más nuevo a lo más antiguo.',
	'news.empty': 'Todavía no publicamos novedades. Mientras tanto, todo se anuncia en nuestras redes.',
	'news.seeSocials': 'Ver redes',
	'news.backHome': 'Volver al inicio',
	'news.postTitle': '{title} · Novedades · {name}',
	'news.postAside': 'Datos de la novedad',
	'news.backAll': '← Todas las novedades',
	'news.related': 'Sigue leyendo',

	'notFound.eyebrow': '$ git checkout pagina',
	'notFound.title': 'No encontramos esa página',
	'notFound.lead': 'El enlace puede estar roto o la página ya no existe. Vuelve al inicio y sigue desde ahí.',
	'notFound.home': 'Volver al inicio',

	'board.title': 'Directiva',
	'board.lead':
		'Las personas que hoy representan a los estudiantes de Computación. Pasa el cursor o toca una tarjeta para conocerlas.',
	'board.count': 'personas que te representan',
	'board.roles': 'Cargos',
	'board.hint': '¿quién es?',
	'board.more': 'pasa el cursor o toca para ver más',
	'board.language': 'lenguaje favorito',

	'join.hello': 'HOLA',

	'faq.termTitle': 'faq — temas',
	'faq.hint': '# o escribe en la terminal:',
	'faq.topicWord': 'tema',
	'faq.log': 'Respuestas de la terminal',
	'faq.promptHint': ' Escribe un comando',
	'faq.placeholder': "escribe 'help'",

	'socials.title': 'Síguenos',
	'socials.lead': 'Todo se anuncia en redes, y por ahí mismo puedes escribirnos por mensaje directo.',

	'footer.university': 'Universidad Nacional de Loja',
	'footer.madeBy': 'Sitio hecho por {name}, estudiante de Computación en la UNL.',
	'footer.contact': 'Contacto del autor',
	'footer.portfolio': 'portafolio',
	'footer.email': 'correo',
} as const;

const en: Record<keyof typeof es, string> = {
	skip: 'Skip to content',
	'nav.label': 'Main',
	'nav.home': '{name}, home',
	'lang.switchText': 'ES',
	'lang.switchLabel': 'Versión en español',
	'theme.toggle': 'Dark mode',
	newTab: '(opens in a new tab)',
	'demo.title': 'Sample content',
	'demo.detail': 'Sample detail',
	soon: 'coming soon',

	'hero.activities': 'See activities',
	'hero.instagram': 'Follow us on Instagram',

	'activities.title': 'Activities',
	'activities.aside': 'Next activity and filters',
	'activities.intro':
		'Above, what is coming (dotted line: it has not happened yet). Below, what we have already done, back to day one.',
	'activities.next': 'Next activity',
	'activities.date': 'date',
	'activities.branch': 'Activities of {title}',
	'count.is': 'it is',
	'count.one': 'in',
	'count.many': 'in',
	'count.today': 'today',
	'count.dayOne': 'day',
	'count.dayMany': 'days',
	'filters.label': 'Filter activities by type',
	'filters.all': 'all',
	'filters.status': '{type}: {shown} of {total}',
	'type.taller': 'workshop',
	'type.charla': 'talk',
	'type.evento': 'event',
	'type.comunidad': 'community',
	'legend.label': 'Legend',
	'legend.next': 'upcoming',
	'legend.planned': 'dotted line: planned',
	'legend.past': 'past',
	'legend.branch': 'branch: event with several activities',
	'legend.head': 'HEAD: today',
	'commit.upcoming': '(upcoming)',
	'commit.new': 'new!',
	'meta.hora': 'time',
	'meta.lugar': 'place',
	'meta.para': 'for',

	'news.title': 'News',
	'news.lead': 'The latest we announced: notices, results and news for people studying Computer Science.',
	'news.seeAll': 'See all news',
	'news.seeCount': 'See all {count} news items',
	'news.pageDescription': 'Notices, results and news from {name}, the Computer Science student association at the UNL.',
	'news.pageLead': 'Everything we have announced, newest first.',
	'news.empty': 'We have not published any news yet. Meanwhile, everything is announced on our socials.',
	'news.seeSocials': 'See socials',
	'news.backHome': 'Back to home',
	'news.postTitle': '{title} · News · {name}',
	'news.postAside': 'News details',
	'news.backAll': '← All news',
	'news.related': 'Keep reading',

	'notFound.eyebrow': '$ git checkout page',
	'notFound.title': 'We could not find that page',
	'notFound.lead': 'The link may be broken or the page may no longer exist. Head back home and pick up from there.',
	'notFound.home': 'Back to the English home',

	'board.title': 'Board',
	'board.lead': 'The people who represent Computer Science students today. Hover or tap a card to meet them.',
	'board.count': 'people who represent you',
	'board.roles': 'Roles',
	'board.hint': 'who is it?',
	'board.more': 'hover or tap to see more',
	'board.language': 'favorite language',

	'join.hello': 'HELLO',

	'faq.termTitle': 'faq — topics',
	'faq.hint': '# or type in the terminal:',
	'faq.topicWord': 'topic',
	'faq.log': 'Terminal replies',
	'faq.promptHint': ' Type a command',
	'faq.placeholder': "type 'help'",

	'socials.title': 'Follow us',
	'socials.lead': 'Everything is announced on socials, and you can send us a direct message there too.',

	'footer.university': 'Universidad Nacional de Loja',
	'footer.madeBy': 'Site built by {name}, a Computer Science student at UNL.',
	'footer.contact': "Author's contact",
	'footer.portfolio': 'portfolio',
	'footer.email': 'email',
};

export type UiKey = keyof typeof es;
export const dictionaries: Record<Locale, Record<UiKey, string>> = { es, en };

export type Translate = (key: UiKey, vars?: Record<string, string | number>) => string;

export function useTranslations(locale: Locale): Translate {
	const dictionary = dictionaries[locale];
	return (key, vars) =>
		dictionary[key].replace(/\{(\w+)\}/g, (whole, name: string) =>
			name in (vars ?? {}) ? String(vars?.[name]) : whole,
		);
}

// Label of an activity type. The slug (`taller`) stays the filter value and the CSS hook; only the text changes.
export function typeLabel(locale: Locale, type: string): string {
	const key = `type.${type}`;
	return key in dictionaries[locale] ? dictionaries[locale][key as UiKey] : type;
}

// Label of a card's meta line (`hora`, `lugar`, `para`); unknown keys show as they came.
export function metaLabel(locale: Locale, key: string): string {
	const full = `meta.${key}`;
	return full in dictionaries[locale] ? dictionaries[locale][full as UiKey] : key;
}
