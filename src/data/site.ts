// Landing-owned content: copy, structural timeline entries and the demo placeholders. Real, editable content (events,
// FAQ, pillars, socials, board, site copy) comes from the admin and is resolved in ./content.ts, with
// ./fallback.json as the committed snapshot used when the admin is unreachable. Edit that, not this, for real content.

import type { Locale } from '../i18n/locales';
import { activityTypes } from '../lib/admin-content/model';
import type { BoardFun, FaqItem, Photo, Pillar, SiteCopy, TimelineEntry } from '../lib/admin-content/model';

import colectivoA from '../assets/demo/colectivo-a.jpg';
import colectivoB from '../assets/demo/colectivo-b.jpg';
import colectivoC from '../assets/demo/colectivo-c.jpg';
import feriaProyectos from '../assets/demo/feria-proyectos.jpg';
import hackaton from '../assets/demo/hackaton.jpg';
import charlaCiberseguridad from '../assets/demo/charla-ciberseguridad.jpg';
import tallerGit from '../assets/demo/taller-git.jpg';
import tallerPython from '../assets/demo/taller-python.jpg';
import torneoProgramacion from '../assets/demo/torneo-programacion.jpg';

export { activityTypes };
export type { ActivityType, TimelineKind } from '../lib/admin-content/model';

// Default copy. The admin's site settings override tagline, description and about when they exist.
export const site: SiteCopy = {
	name: 'ASO Computación',
	tagline: 'Asociación Estudiantil de la carrera de Computación',
	// The hero headline, one entry per line. `headlineAccent` is the line drawn with the red underline.
	headline: ['Entérate de', 'lo que pasa en', 'Computación.'],
	headlineAccent: 2,
	// Caption that appears at the end of the Actividades opener, beside the branch.
	heroCue: 'Baja por la rama: este es nuestro historial.',
	description:
		'Somos la asociación de estudiantes de Computación de la UNL: talleres, charlas y eventos, y tu voz ante la facultad.',
	// Nosotros' statement when the admin sends no about text of its own (the admin's text always wins).
	about: 'Representamos a quienes estudian Computación en la Universidad Nacional de Loja.',
};

// The address people can write to. Shown in the footer and published as the organization's contact in the structured
// data: change it here only.
export const contactEmail = 'aso.computacion@gmail.com';

// Nosotros statement: the about text (the admin's `about`, or the short fallback in `site.about`) set as a statement,
// with the `accents` phrases in sky blue, plus a mono line of facts.
export interface AboutStatement {
	// Phrases of the about text painted in sky, wherever they appear (the admin's text included).
	accents: string[];
	facts: string;
}

export const aboutStatement: AboutStatement = {
	accents: ['Computación', 'Universidad Nacional de Loja'],
	facts: 'Organización estudiantil · ASO Computación – UNL',
};

// Nosotros manifesto: two static lines plus one rotating word. Screen readers get `sr` instead of the animation.
export const manifesto = {
	lines: ['Somos la ASO', 'de Computación'],
	rotor: ['estudiantes', 'comunidad', 'tu voz'],
	sr: 'Somos la ASO de Computación: estudiantes, comunidad y tu voz.',
};

// DEMO: the three pillars of the bento grid (invented copy and demo photos). Shown only while the fallback snapshot has
// no pillars. Replace with the board's own words in the admin.
export const demoPillars: Pillar[] = [
	{
		id: 'representamos',
		word: 'VOZ',
		title: 'Representamos',
		text: 'Llevamos lo que piensan los estudiantes de Computación hasta quienes toman las decisiones en la carrera.',
		image: {
			src: charlaCiberseguridad,
			alt: 'Foto de ejemplo: público sentado durante una charla en un auditorio oscuro',
		},
		demo: true,
	},
	{
		id: 'organizamos',
		word: 'EVENTOS',
		title: 'Organizamos',
		text: 'Talleres, charlas y encuentros para aprender fuera del aula y pasarla bien con tu carrera.',
		image: { src: hackaton, alt: 'Foto de ejemplo: una sala amplia con personas programando en sus puestos' },
		demo: true,
	},
	{
		id: 'acompanamos',
		word: 'APOYO',
		title: 'Acompañamos',
		text: 'Desde primer ciclo: que te sientas escuchado y apoyado desde el primer día.',
		// Draws the isotype outline on the tile (a decorative layer, not a photo).
		faces: true,
		demo: true,
	},
];

export const navLinks = [
	{ label: 'Nosotros', href: '#nosotros' },
	{ label: 'Inscripciones', href: '#inscripciones' },
	{ label: 'Actividades', href: '#actividades' },
	{ label: 'Novedades', href: '/novedades' },
	{ label: 'Foro', href: '#foro' },
	{ label: 'Directiva', href: '#directiva' },
	{ label: 'FAQ', href: '#faq' },
	{ label: 'Redes', href: '#redes' },
];

// The three entries of the activity graph that are not events: they belong to the landing, not to the admin.
export const timelineAnchors: { next: TimelineEntry; head: TimelineEntry; initial: TimelineEntry } = {
	next: {
		id: 'proxima-actividad',
		kind: 'next',
		stamp: 'Lo que sigue',
		title: 'La próxima actividad se anuncia primero en Instagram',
		description: 'Síguenos para enterarte en cuanto se publique.',
		href: 'https://www.instagram.com/aso_computacion/',
		hrefLabel: 'Abrir Instagram',
	},
	// The description is rewritten from the real board size (see compose.ts).
	head: {
		id: 'directiva-actual',
		kind: 'head',
		stamp: 'HEAD',
		title: 'Directiva actual',
		description: 'Siete integrantes representan hoy a los estudiantes de la carrera.',
		href: '#directiva',
		hrefLabel: 'Conocer a la directiva',
	},
	initial: {
		id: 'fundacion',
		kind: 'initial',
		stamp: '2020',
		title: 'Nace ASO Computación',
		description: 'Se funda la asociación estudiantil de la carrera de Computación.',
	},
};

// DEMO: placeholder events (invented titles, dates and photos), shown only on the fallback path so the prototype looks
// complete. Their kind (upcoming or past) is derived from `date` at build time, like any other event.
export const demoEvents: Omit<TimelineEntry, 'kind'>[] = [
	{
		id: 'feria-de-proyectos',
		date: '2026-12-11',
		type: 'evento',
		demo: true,
		stamp: '11 dic 2026',
		title: 'Feria de proyectos y cierre de ciclo',
		description: 'Un espacio para mostrar lo que construimos durante el ciclo y despedirlo juntos.',
		meta: { hora: '10:00', lugar: 'Auditorio de la facultad', para: 'todos los ciclos' },
		image: { src: feriaProyectos, alt: 'Foto de ejemplo: tres estudiantes sonríen frente a sus laptops' },
	},
	{
		id: 'hackaton',
		date: '2026-11-28',
		type: 'evento',
		demo: true,
		stamp: '28 nov 2026',
		title: 'Hackatón ASO Computación',
		description: 'Equipos, una idea y un día para construirla. Ven con tu laptop.',
		meta: { hora: '09:00', lugar: 'Laboratorios de la carrera', para: 'todos los ciclos' },
		image: { src: hackaton, alt: 'Foto de ejemplo: una sala amplia con personas programando en sus puestos' },
	},
	{
		id: 'taller-python',
		date: '2026-11-12',
		type: 'taller',
		demo: true,
		stamp: '12 nov 2026',
		title: 'Taller de Python para primer ciclo',
		description: 'Tu primer programa, paso a paso y sin experiencia previa.',
		meta: { hora: '15:00', lugar: 'Laboratorio de cómputo', para: 'primer ciclo' },
		featured: true,
		image: { src: tallerPython, alt: 'Foto de ejemplo: dos personas revisan código en una laptop' },
	},
	{
		id: 'charla-ciberseguridad',
		date: '2026-09-18',
		type: 'charla',
		demo: true,
		stamp: '18 sep 2026',
		title: 'Charla: introducción a la ciberseguridad',
		description: 'Cómo se protege la información hoy y por dónde puedes empezar a aprender.',
		meta: { hora: '16:00', lugar: 'Auditorio de la facultad', para: 'todos los ciclos' },
		featured: true,
		image: {
			src: charlaCiberseguridad,
			alt: 'Foto de ejemplo: público sentado durante una charla en un auditorio oscuro',
		},
	},
	{
		id: 'torneo-programacion',
		date: '2026-06-25',
		type: 'evento',
		demo: true,
		stamp: '25 jun 2026',
		title: 'Torneo de programación',
		description: 'Resolver problemas contra el reloj, en equipo, para cerrar el semestre.',
		meta: { hora: '14:00', lugar: 'Laboratorios de la carrera', para: 'todos los ciclos' },
		featured: true,
		image: {
			src: torneoProgramacion,
			alt: 'Foto de ejemplo: laptops, cuadernos y manos trabajando sobre una mesa vista desde arriba',
		},
	},
	{
		id: 'taller-git',
		date: '2026-05-20',
		type: 'taller',
		demo: true,
		stamp: '20 may 2026',
		title: 'Taller de Git y GitHub',
		description: 'Control de versiones desde cero: cómo guardar, compartir y trabajar en equipo.',
		meta: { hora: '15:00', lugar: 'Laboratorio de cómputo', para: 'todos los ciclos' },
		image: { src: tallerGit, alt: 'Foto de ejemplo: estudiantes ríen mientras trabajan con laptops en una biblioteca' },
	},
];

// DEMO: the "contribute" call to action (invented copy; the Instagram DM channel is real). The board has no open
// seats, so this never invites people to join the ASO: it invites ideas, feedback and community. No statistics, no
// certificates. Replace with the board's own words, then drop `demo`.
export const join = {
	demo: true,
	eyebrow: 'Participa',
	headline: ['Tus ideas', 'también hacen', 'commit'],
	lead: 'Cuéntanos qué cambiarías y ayúdanos a mejorar la carrera.',
	stickers: ['¡propón!', 'ideas de todos los ciclos'],
	reasons: [
		{
			title: 'Propón un taller o una charla',
		},
		{
			title: 'Cuéntanos qué mejorar en la carrera',
		},
		{
			title: 'Ayúdanos a difundir y participa',
		},
		{
			title: 'Comparte lo que sabes con otros ciclos',
		},
	],
	cta: 'Envíanos tu idea',
	// Second collage row: activity-type tags (no photos of people here; board photos live only in Directiva).
	tags: [
		'#talleres',
		'#charlas',
		'#hackatones',
		'#comunidad',
		'#primer-ciclo',
		'#todos-los-ciclos',
		'#voz-estudiantil',
		'#aprender-haciendo',
	],
};

// DEMO: extra stock photos used only by the Join collage (see src/assets/demo/SOURCES.md), on the fallback path.
export const demoCollage: Photo[] = [
	{ src: colectivoA, alt: '' },
	{ src: colectivoB, alt: '' },
	{ src: colectivoC, alt: '' },
];

// The forum section. The forum itself lives on the admin's origin (`/foro`, see ../lib/admin-content/forum.ts); this is
// its door on the landing: the categories as they exist there and a few example threads.
export type ForumCategoryId = 'general' | 'materias' | 'propuestas';

export interface ForumThread {
	id: string;
	title: string;
	category: ForumCategoryId;
}

// DEMO: the example threads (invented titles; they are not read from the forum, which has no
// public API for them yet) and the intro copy. The categories are the forum's real ones. Replace the threads with a real
// feed, or with the board's own words, then drop `demo`.
export const forum = {
	demo: true,
	eyebrow: 'Entre estudiantes',
	title: 'El foro de Computación',
	lead: 'Pregunta sobre materias, propón talleres y arma equipo.',
	// Names and descriptions as the forum has them.
	categories: [
		{ id: 'general', name: 'General', description: 'Todo lo que no cabe en otra categoría.' },
		{ id: 'materias', name: 'Materias', description: 'Dudas de las materias, apuntes y preparación de exámenes.' },
		{ id: 'propuestas', name: 'Propuestas', description: 'Ideas de talleres, charlas y eventos para la asociación.' },
	] as { id: ForumCategoryId; name: string; description: string }[],
	threads: [
		{
			id: 'estructuras-de-datos',
			title: '¿Cómo preparo el examen de Estructuras de Datos?',
			category: 'materias',
		},
		{
			id: 'postgres-docker',
			title: 'Error al conectar Postgres desde Docker en el laboratorio',
			category: 'materias',
		},
		{
			id: 'taller-docker',
			title: 'Propuesta: taller de Docker para primeros ciclos',
			category: 'propuestas',
		},
		{
			id: 'equipo-hackathon',
			title: 'Busco equipo para el hackathon (backend con Node)',
			category: 'general',
		},
		{
			id: 'electivas',
			title: '¿Qué electivas recomiendan para 7.º ciclo?',
			category: 'general',
		},
		{
			id: 'laboratorio-sabados',
			title: 'Horario del laboratorio abierto los sábados',
			category: 'general',
		},
	] as ForumThread[],
};

// Section copy of the FAQ. The items come from the admin; `demoFaqItems` fills the section while the fallback has none.
export const faqCopy = {
	title: 'Preguntas frecuentes',
	lead: 'Lo que más nos preguntan.',
};

// DEMO: frequently asked questions (invented answers; the Instagram DM channel is real).
export const demoFaqItems: FaqItem[] = [
	{
		topic: 'participar',
		q: '¿Quién puede participar?',
		a: 'Las actividades están abiertas a cualquier estudiante de Computación, de primer ciclo a último, sin experiencia previa. La directiva, en cambio, es elegida: aquí lo que sí puedes hacer es aportar ideas.',
	},
	{
		topic: 'costo',
		q: '¿Tiene algún costo?',
		a: 'Participar en las actividades de la ASO es gratis. Si alguna actividad necesitara un aporte, se avisa de antemano en Instagram.',
	},
	{
		topic: 'avisos',
		q: '¿Cómo me entero de las actividades?',
		a: 'Todo se anuncia primero en nuestro Instagram. También publicamos en TikTok y LinkedIn.',
	},
	{
		topic: 'proponer',
		q: '¿Puedo proponer un taller o una charla?',
		a: 'Claro, nos encantan. Envíanos tu idea por mensaje directo y la revisamos con la directiva.',
	},
	{
		topic: 'aso',
		q: '¿Qué hace la ASO por mí?',
		a: 'Representamos a los estudiantes, organizamos actividades para aprender fuera del aula y acompañamos a quienes llegan a primer ciclo. Tus ideas nos ayudan a hacerlo mejor.',
	},
	{
		topic: 'contacto',
		q: '¿Cómo contacto a la directiva?',
		a: 'Por mensaje directo en nuestras redes, sobre todo Instagram. No tenemos correo público.',
	},
];

// DEMO: playful fields for the "git show" panel, keyed by member name. Invented placeholders, not real answers, and
// never sent to or read from the admin: the board is name, role and photo only (S4). Never add age, phone, email,
// ciclo or personal handles here.
export const demoBoardFun: Record<string, BoardFun> = {
	'Emilio Jaramillo': { language: 'TypeScript', motto: 'fix: dormir también es un feature', demo: true },
	'Viviana Córdova': { language: 'Python', motto: 'feat: más café, menos bugs', demo: true },
	'Miguel Armas': { language: 'Java', motto: 'docs: si no está en el acta, no pasó', demo: true },
	'Kiara Condoy': { language: 'Rust', motto: 'chore: cuadrar las cuentas, otra vez', demo: true },
	'Marco Chiliguano': { language: 'JavaScript', motto: 'feat: pulgar arriba para este PR', demo: true },
	'Alejandro Padilla': { language: 'C++', motto: 'style: código limpio, camisa planchada', demo: true },
	'Melissa Contento': { language: 'Go', motto: 'fix: el bug era un punto y coma', demo: true },
};

// English versions of the landing's own copy. Content from the admin (and the demo placeholders standing in for it)
// stays in Spanish: only the landing's fixed words are translated.
type Anchors = typeof timelineAnchors;

export interface LandingCopy {
	site: SiteCopy;
	aboutStatement: AboutStatement;
	manifesto: typeof manifesto;
	navLinks: typeof navLinks;
	timelineAnchors: Anchors;
	join: typeof join;
	forum: typeof forum;
	faqCopy: typeof faqCopy;
}

const enCopy: LandingCopy = {
	site: {
		name: 'ASO Computación',
		tagline: 'Student association of the Computer Science program',
		headline: ['Keep up with', 'what is going on in', 'Computer Science.'],
		headlineAccent: 2,
		heroCue: 'Scroll down the branch: this is our history.',
		description:
			'We are the Computer Science student association at the UNL: workshops, talks and events, and your voice before the faculty.',
		about: 'We represent the students of Computer Science at the Universidad Nacional de Loja.',
	},
	aboutStatement: {
		// The admin's about text stays in Spanish, so its phrases are painted too.
		accents: ['Computer Science', 'Computación', 'Universidad Nacional de Loja'],
		facts: 'Student organization · ASO Computación – UNL',
	},
	manifesto: {
		lines: ['We are the ASO', 'of Computer Science'],
		rotor: ['students', 'community', 'your voice'],
		sr: 'We are the Computer Science ASO: students, community and your voice.',
	},
	navLinks: [
		{ label: 'About', href: '#nosotros' },
		{ label: 'Sign-ups', href: '#inscripciones' },
		{ label: 'Activities', href: '#actividades' },
		{ label: 'News', href: '/novedades' },
		{ label: 'Forum', href: '#foro' },
		{ label: 'Board', href: '#directiva' },
		{ label: 'FAQ', href: '#faq' },
		{ label: 'Socials', href: '#redes' },
	],
	timelineAnchors: {
		next: {
			...timelineAnchors.next,
			stamp: 'Up next',
			title: 'The next activity is announced first on Instagram',
			description: 'Follow us to hear about it as soon as it is posted.',
			hrefLabel: 'Open Instagram',
		},
		head: {
			...timelineAnchors.head,
			title: 'Current board',
			description: 'Seven members represent the students of the program today.',
			hrefLabel: 'Meet the board',
		},
		initial: {
			...timelineAnchors.initial,
			title: 'ASO Computación is born',
			description: 'The student association of the Computer Science program is founded.',
		},
	},
	join: {
		...join,
		headline: ['Your ideas', 'make a', 'commit too'],
		eyebrow: 'Get involved',
		lead: 'Tell us what you would change and help us improve the program.',
		stickers: ['pitch it!', 'ideas from every semester'],
		reasons: [
			{
				title: 'Pitch a workshop or a talk',
			},
			{
				title: 'Tell us what to improve in the program',
			},
			{
				title: 'Help spread the word and take part',
			},
			{
				title: 'Share what you know with other semesters',
			},
		],
		cta: 'Send us your idea',
		tags: [
			'#workshops',
			'#talks',
			'#hackathons',
			'#community',
			'#first-semester',
			'#every-semester',
			'#student-voice',
			'#learn-by-doing',
		],
	},
	// The categories keep the forum's own names (the forum is in Spanish) and so do the example threads; what is
	// translated is the landing's words around them.
	forum: {
		...forum,
		title: 'The Computer Science forum',
		eyebrow: 'Student to student',
		lead: 'Ask about your courses, pitch workshops and build a team.',
		categories: [
			{ ...forum.categories[0], description: 'Everything that does not fit another category.' },
			{ ...forum.categories[1], description: 'Questions about courses, notes and exam prep.' },
			{ ...forum.categories[2], description: 'Ideas for workshops, talks and events for the association.' },
		],
	},
	faqCopy: {
		title: 'Frequently asked questions',
		lead: 'What we get asked the most.',
	},
};

export const copy: Record<Locale, LandingCopy> = {
	es: { site, aboutStatement, manifesto, navLinks, timelineAnchors, join, forum, faqCopy },
	en: enCopy,
};
