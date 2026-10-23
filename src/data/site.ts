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
	// The hero headline, one entry per line so each line can move on its own. `headlineAccent` is the line drawn in sky.
	headline: ['Entérate de', 'lo que pasa en', 'Computación.'],
	headlineAccent: 2,
	// Caption that appears at the end of the hero scroll moment, beside the branch.
	heroCue: 'Baja por la rama: este es nuestro historial.',
	description:
		'ASO Computación es la asociación estudiantil de la carrera. Aquí está nuestro historial, actividad por actividad.',
	// Verbatim from the ASO's own LinkedIn page.
	about:
		'La Asociación de Estudiantes de la Carrera de Computación (ASO Computación – UNL) es una organización estudiantil que representa a la comunidad de futuros profesionales en tecnologías de la información de la Universidad Nacional de Loja.',
};

// Phrases of `site.about` drawn in sky blue. They must appear verbatim in the text.
export const aboutHighlights = ['organización estudiantil', 'Universidad Nacional de Loja'];

// Text of the diagonal ribbon: ASO verbs written as commit messages. Playful, no claims or numbers.
export const ribbon = [
	'feat: representar a los estudiantes',
	'fix: aprender en equipo',
	'chore: construir comunidad',
	'docs: compartir lo que sabemos',
	'feat: primer ciclo, bienvenido',
	'refactor: hacer la carrera más llevadera',
];

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
		image: { src: charlaCiberseguridad, alt: 'Foto de ejemplo: público sentado durante una charla en un auditorio oscuro' },
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
	{ label: 'Actividades', href: '#actividades' },
	{ label: 'Novedades', href: '/novedades' },
	{ label: 'Nosotros', href: '#nosotros' },
	{ label: 'Directiva', href: '#directiva' },
	{ label: 'FAQ', href: '#faq' },
	{ label: 'Redes', href: '#redes' },
];

// The three entries of the activity graph that are not events: they belong to the landing, not to the admin.
export const timelineAnchors: { next: TimelineEntry; head: TimelineEntry; initial: TimelineEntry } = {
	next: {
		id: 'proxima-actividad',
		msg: 'chore: pronto en tu feed',
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
		msg: 'docs(directiva): conoce a quienes hacen que esto pase',
		kind: 'head',
		stamp: 'HEAD',
		title: 'Directiva actual',
		description: 'Siete integrantes representan hoy a los estudiantes de la carrera.',
		href: '#directiva',
		hrefLabel: 'Conocer a la directiva',
	},
	initial: {
		id: 'fundacion',
		msg: 'init: hola, mundo',
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
		msg: 'feat(feria): demo day, esta vez sin demo en vivo que falle (ojalá)',
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
		msg: 'feat(hackaton): mucho café, cero bugs (ojalá)',
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
		msg: 'feat(taller): print("hola, primer ciclo")',
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
		msg: 'fix(charla): no, "123456" no es una contraseña segura',
		demo: true,
		stamp: '18 sep 2026',
		title: 'Charla: introducción a la ciberseguridad',
		description: 'Cómo se protege la información hoy y por dónde puedes empezar a aprender.',
		meta: { hora: '16:00', lugar: 'Auditorio de la facultad', para: 'todos los ciclos' },
		featured: true,
		image: { src: charlaCiberseguridad, alt: 'Foto de ejemplo: público sentado durante una charla en un auditorio oscuro' },
	},
	{
		id: 'torneo-programacion',
		date: '2026-06-25',
		type: 'evento',
		msg: 'feat(torneo): resolver, equivocarse, resolver otra vez',
		demo: true,
		stamp: '25 jun 2026',
		title: 'Torneo de programación',
		description: 'Resolver problemas contra el reloj, en equipo, para cerrar el semestre.',
		meta: { hora: '14:00', lugar: 'Laboratorios de la carrera', para: 'todos los ciclos' },
		featured: true,
		image: { src: torneoProgramacion, alt: 'Foto de ejemplo: laptops, cuadernos y manos trabajando sobre una mesa vista desde arriba' },
	},
	{
		id: 'taller-git',
		date: '2026-05-20',
		type: 'taller',
		msg: 'chore(taller): git commit -m "ahora sí guardé"',
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
	eyebrow: 'CONTRIBUTING.md',
	headline: ['Tus ideas', 'también hacen', 'commit'],
	lead: 'La carrera la mejoramos entre todos. Cuéntanos qué cambiarías y ayúdanos a fortalecer la comunidad.',
	stickers: ['¡propón!', 'ideas de todos los ciclos'],
	reasons: [
		{ title: 'Propón un taller o una charla', text: 'Si hay algo que quieres aprender o enseñar, escríbenos y lo armamos juntos.' },
		{ title: 'Cuéntanos qué mejorar en la carrera', text: 'Lo que ves desde tu ciclo ayuda a que la ASO lleve mejor la voz de todos.' },
		{ title: 'Ayúdanos a difundir y participa', text: 'Ven a las actividades, comparte los anuncios y trae a tus compañeros.' },
		{ title: 'Comparte lo que sabes con otros ciclos', text: 'Lo que aprendiste hace un año le sirve a quien está empezando.' },
	],
	newcomer: {
		title: 'Tu primera idea',
		lead: 'Al principio nadie conoce a nadie.',
		steps: [
			'Es normal: llega a una actividad, saluda y quédate a ver. Todas están abiertas a cualquier estudiante de Computación.',
			'No necesitas experiencia previa para opinar. Escríbenos por mensaje directo y te contamos cuál es la próxima actividad.',
		],
	},
	cta: 'Envíanos tu idea',
	// Second collage row: activity-type tags (no photos of people here; board photos live only in Directiva).
	tags: ['#talleres', '#charlas', '#hackatones', '#comunidad', '#primer-ciclo', '#todos-los-ciclos', '#voz-estudiantil', '#aprender-haciendo'],
};

// DEMO: extra stock photos used only by the Join collage (see src/assets/demo/SOURCES.md), on the fallback path.
export const demoCollage: Photo[] = [
	{ src: colectivoA, alt: '' },
	{ src: colectivoB, alt: '' },
	{ src: colectivoC, alt: '' },
];

// Section copy of the FAQ. The items come from the admin; `demoFaqItems` fills the section while the fallback has none.
export const faqCopy = {
	title: 'Preguntas frecuentes',
	lead: 'Lo que más nos preguntan sobre la ASO y sus actividades. Si falta algo, escríbenos por mensaje directo.',
};

// DEMO: frequently asked questions (invented answers; the Instagram DM channel is real). `topic` is the slug shown as
// `git help <topic>`.
export const demoFaqItems: FaqItem[] = [
	{ topic: 'participar', q: '¿Quién puede participar?', a: 'Las actividades están abiertas a cualquier estudiante de Computación, de primer ciclo a último, sin experiencia previa. La directiva, en cambio, es elegida: aquí lo que sí puedes hacer es aportar ideas.' },
	{ topic: 'costo', q: '¿Tiene algún costo?', a: 'Participar en las actividades de la ASO es gratis. Si alguna actividad necesitara un aporte, se avisa de antemano en Instagram.' },
	{ topic: 'avisos', q: '¿Cómo me entero de las actividades?', a: 'Todo se anuncia primero en nuestro Instagram. También publicamos en TikTok y LinkedIn.' },
	{ topic: 'proponer', q: '¿Puedo proponer un taller o una charla?', a: 'Claro, nos encantan. Envíanos tu idea por mensaje directo y la revisamos con la directiva.' },
	{ topic: 'aso', q: '¿Qué hace la ASO por mí?', a: 'Representamos a los estudiantes, organizamos actividades para aprender fuera del aula y acompañamos a quienes llegan a primer ciclo. Tus ideas nos ayudan a hacerlo mejor.' },
	{ topic: 'contacto', q: '¿Cómo contacto a la directiva?', a: 'Por mensaje directo en nuestras redes, sobre todo Instagram. No tenemos correo público.' },
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
	aboutHighlights: string[];
	ribbon: string[];
	manifesto: typeof manifesto;
	navLinks: typeof navLinks;
	timelineAnchors: Anchors;
	join: typeof join;
	faqCopy: typeof faqCopy;
}

const enCopy: LandingCopy = {
	site: {
		name: 'ASO Computación',
		tagline: 'Student association of the Computer Science program',
		headline: ['Keep up with', 'what is going on in', 'Computer Science.'],
		headlineAccent: 2,
		heroCue: 'Scroll down the branch: this is our history.',
		description: 'ASO Computación is the student association of the program. Here is our history, activity by activity.',
		about:
			'The Computer Science Student Association (ASO Computación – UNL) is a student organization that represents the community of future information technology professionals at the Universidad Nacional de Loja.',
	},
	// The admin's about text stays in Spanish, so its phrases are highlighted too.
	aboutHighlights: ['student organization', 'Universidad Nacional de Loja', ...aboutHighlights],
	ribbon: [
		'feat: represent the students',
		'fix: learn as a team',
		'chore: build community',
		'docs: share what we know',
		'feat: first semester, welcome',
		'refactor: make the degree lighter',
	],
	manifesto: {
		lines: ['We are the ASO', 'of Computer Science'],
		rotor: ['students', 'community', 'your voice'],
		sr: 'We are the Computer Science ASO: students, community and your voice.',
	},
	navLinks: [
		{ label: 'Activities', href: '#actividades' },
		{ label: 'News', href: '/novedades' },
		{ label: 'About', href: '#nosotros' },
		{ label: 'Board', href: '#directiva' },
		{ label: 'FAQ', href: '#faq' },
		{ label: 'Socials', href: '#redes' },
	],
	timelineAnchors: {
		next: {
			...timelineAnchors.next,
			msg: 'chore: soon in your feed',
			stamp: 'Up next',
			title: 'The next activity is announced first on Instagram',
			description: 'Follow us to hear about it as soon as it is posted.',
			hrefLabel: 'Open Instagram',
		},
		head: {
			...timelineAnchors.head,
			msg: 'docs(board): meet the people who make this happen',
			title: 'Current board',
			description: 'Seven members represent the students of the program today.',
			hrefLabel: 'Meet the board',
		},
		initial: {
			...timelineAnchors.initial,
			msg: 'init: hello, world',
			title: 'ASO Computación is born',
			description: 'The student association of the Computer Science program is founded.',
		},
	},
	join: {
		...join,
		headline: ['Your ideas', 'make a', 'commit too'],
		lead: 'We make the program better together. Tell us what you would change and help us make the community stronger.',
		stickers: ['pitch it!', 'ideas from every semester'],
		reasons: [
			{ title: 'Pitch a workshop or a talk', text: 'If there is something you want to learn or teach, write to us and we will put it together.' },
			{ title: 'Tell us what to improve in the program', text: 'What you see from your semester helps the ASO carry everyone’s voice better.' },
			{ title: 'Help spread the word and take part', text: 'Come to the activities, share the announcements and bring your classmates.' },
			{ title: 'Share what you know with other semesters', text: 'What you learned a year ago helps someone who is just starting.' },
		],
		newcomer: {
			title: 'Your first idea',
			lead: 'At first nobody knows anybody.',
			steps: [
				'That is normal: come to an activity, say hi and stay to watch. They are all open to any Computer Science student.',
				'You need no experience to have an opinion. Send us a direct message and we will tell you about the next activity.',
			],
		},
		cta: 'Send us your idea',
		tags: ['#workshops', '#talks', '#hackathons', '#community', '#first-semester', '#every-semester', '#student-voice', '#learn-by-doing'],
	},
	faqCopy: {
		title: 'Frequently asked questions',
		lead: 'What people ask us most about the ASO and its activities. If something is missing, send us a direct message.',
	},
};

export const copy: Record<Locale, LandingCopy> = {
	es: { site, aboutHighlights, ribbon, manifesto, navLinks, timelineAnchors, join, faqCopy },
	en: enCopy,
};
