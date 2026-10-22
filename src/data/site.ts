// Single source of truth for landing content. Edit this file to update the page.

import type { ImageMetadata } from 'astro';
import { siInstagram, siTiktok, siTwitch } from 'simple-icons';

import colectivoA from '../assets/demo/colectivo-a.jpg';
import colectivoB from '../assets/demo/colectivo-b.jpg';
import colectivoC from '../assets/demo/colectivo-c.jpg';
import feriaProyectos from '../assets/demo/feria-proyectos.jpg';
import hackaton from '../assets/demo/hackaton.jpg';
import charlaCiberseguridad from '../assets/demo/charla-ciberseguridad.jpg';
import tallerGit from '../assets/demo/taller-git.jpg';
import tallerPython from '../assets/demo/taller-python.jpg';
import torneoProgramacion from '../assets/demo/torneo-programacion.jpg';
import emilioJaramillo from '../assets/team/emilio-jaramillo.jpg';
import vivianaCordova from '../assets/team/viviana-cordova.jpg';
import miguelArmas from '../assets/team/miguel-armas.jpg';
import kiaraCondoy from '../assets/team/kiara-condoy.jpg';
import marcoChiliguano from '../assets/team/marco-chiliguano.jpg';
import alejandroPadilla from '../assets/team/alejandro-padilla.jpg';
import melissaContento from '../assets/team/melissa-contento.jpg';

export const site = {
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

// DEMO: the three pillars of the bento grid (invented copy and demo photos). Replace with the board's own words.
export const pillars = [
	{
		id: 'representamos',
		word: 'VOZ',
		title: 'Representamos',
		text: 'Llevamos lo que piensan los estudiantes de Computación hasta quienes toman las decisiones en la carrera.',
		image: charlaCiberseguridad,
		imageAlt: 'Foto de ejemplo: público sentado durante una charla en un auditorio oscuro',
		demo: true,
	},
	{
		id: 'organizamos',
		word: 'EVENTOS',
		title: 'Organizamos',
		text: 'Talleres, charlas y encuentros para aprender fuera del aula y pasarla bien con tu carrera.',
		image: hackaton,
		imageAlt: 'Foto de ejemplo: una sala amplia con personas programando en sus puestos',
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
	{ label: 'Nosotros', href: '#nosotros' },
	{ label: 'Directiva', href: '#directiva' },
	{ label: 'FAQ', href: '#faq' },
	{ label: 'Redes', href: '#redes' },
];

export const activityTypes = ['taller', 'charla', 'evento', 'comunidad'] as const;
export type ActivityType = (typeof activityTypes)[number];

export type TimelineKind = 'next' | 'upcoming' | 'head' | 'commit' | 'merge' | 'initial';

interface TimelineEntry {
	// Stable slug. Also seeds the decorative short hash shown next to the entry.
	id: string;
	kind: TimelineKind;
	// Red chip above the title. Use a real date label, or a short word for undated entries.
	stamp?: string;
	title: string;
	description?: string;
	// ISO date (YYYY-MM-DD) of dated upcoming entries. The nearest one feeds the countdown panel.
	date?: string;
	// Category used by the activity filter chips. Entries without a type are never dimmed.
	type?: ActivityType;
	// Playful conventional-commit message shown in mono under the title. Never a factual claim.
	msg?: string;
	// Optional feature branch drawn as a second lane between this entry and the next one.
	branch?: {
		name: string;
		commits: { id: string; title: string }[];
	};
	// DEMO CONTENT: placeholder entry (invented title, date and photo). Rendered with a "demo" tag.
	// Remove the entry, or replace it with a verified one and drop the flag, before publishing.
	demo?: boolean;
	// Optional practical details, shown in mono. Only include what is actually known for real entries.
	meta?: { hora?: string; lugar?: string; para?: string };
	// Large photo at the bottom of the card. Without it the photo renders as a small square thumbnail.
	// Keep it for the next upcoming event and at most two past highlights so the graph keeps its rhythm.
	featured?: boolean;
	// Optional photo shown with the card. Demo photos live in src/assets/demo (see SOURCES.md).
	image?: ImageMetadata;
	imageAlt?: string;
	// Optional link. External URLs (http...) open in a new tab.
	href?: string;
	hrefLabel?: string;
}

// Newest first, like `git log`. Real entries: ASO Computación public LinkedIn posts, to be confirmed by the board.
// Entries flagged `demo: true` are invented placeholders so the prototype looks complete.
export const timeline: TimelineEntry[] = [
	{
		id: 'proxima-actividad',
		msg: 'chore: pronto en tu feed',
		kind: 'next',
		stamp: 'Lo que sigue',
		title: 'La próxima actividad se anuncia primero en Instagram',
		description: 'Síguenos para enterarte en cuanto se publique.',
		href: 'https://www.instagram.com/aso_computacion/',
		hrefLabel: 'Abrir Instagram',
	},
	// DEMO: upcoming events (dates invented).
	{
		id: 'feria-de-proyectos',
		date: '2026-12-11',
		type: 'evento',
		msg: 'feat(feria): demo day, esta vez sin demo en vivo que falle (ojalá)',
		kind: 'upcoming',
		demo: true,
		stamp: '11 dic 2026',
		title: 'Feria de proyectos y cierre de ciclo',
		description: 'Un espacio para mostrar lo que construimos durante el ciclo y despedirlo juntos.',
		meta: { hora: '10:00', lugar: 'Auditorio de la facultad', para: 'todos los ciclos' },
		image: feriaProyectos,
		imageAlt: 'Foto de ejemplo: tres estudiantes sonríen frente a sus laptops',
	},
	{
		id: 'hackaton',
		date: '2026-11-28',
		type: 'evento',
		msg: 'feat(hackaton): mucho café, cero bugs (ojalá)',
		kind: 'upcoming',
		demo: true,
		stamp: '28 nov 2026',
		title: 'Hackatón ASO Computación',
		description: 'Equipos, una idea y un día para construirla. Ven con tu laptop.',
		meta: { hora: '09:00', lugar: 'Laboratorios de la carrera', para: 'todos los ciclos' },
		image: hackaton,
		imageAlt: 'Foto de ejemplo: una sala amplia con personas programando en sus puestos',
	},
	{
		id: 'taller-python',
		date: '2026-11-12',
		type: 'taller',
		msg: 'feat(taller): print("hola, primer ciclo")',
		kind: 'upcoming',
		demo: true,
		stamp: '12 nov 2026',
		title: 'Taller de Python para primer ciclo',
		description: 'Tu primer programa, paso a paso y sin experiencia previa.',
		meta: { hora: '15:00', lugar: 'Laboratorio de cómputo', para: 'primer ciclo' },
		featured: true,
		image: tallerPython,
		imageAlt: 'Foto de ejemplo: dos personas revisan código en una laptop',
	},
	{
		id: 'directiva-actual',
		msg: 'docs(directiva): conoce a quienes hacen que esto pase',
		kind: 'head',
		stamp: 'HEAD',
		title: 'Directiva actual',
		description: 'Siete integrantes representan hoy a los estudiantes de la carrera.',
		href: '#directiva',
		hrefLabel: 'Conocer a la directiva',
	},
	// DEMO: past activities (titles and dates invented).
	{
		id: 'charla-ciberseguridad',
		type: 'charla',
		msg: 'fix(charla): no, "123456" no es una contraseña segura',
		kind: 'commit',
		demo: true,
		stamp: '18 sep 2026',
		title: 'Charla: introducción a la ciberseguridad',
		description: 'Cómo se protege la información hoy y por dónde puedes empezar a aprender.',
		meta: { hora: '16:00', lugar: 'Auditorio de la facultad', para: 'todos los ciclos' },
		featured: true,
		image: charlaCiberseguridad,
		imageAlt: 'Foto de ejemplo: público sentado durante una charla en un auditorio oscuro',
	},
	{
		id: 'torneo-programacion',
		type: 'evento',
		msg: 'feat(torneo): resolver, equivocarse, resolver otra vez',
		kind: 'commit',
		demo: true,
		stamp: '25 jun 2026',
		title: 'Torneo de programación',
		description: 'Resolver problemas contra el reloj, en equipo, para cerrar el semestre.',
		meta: { hora: '14:00', lugar: 'Laboratorios de la carrera', para: 'todos los ciclos' },
		featured: true,
		image: torneoProgramacion,
		imageAlt: 'Foto de ejemplo: laptops, cuadernos y manos trabajando sobre una mesa vista desde arriba',
	},
	{
		id: 'taller-git',
		type: 'taller',
		msg: 'chore(taller): git commit -m "ahora sí guardé"',
		kind: 'commit',
		demo: true,
		stamp: '20 may 2026',
		title: 'Taller de Git y GitHub',
		description: 'Control de versiones desde cero: cómo guardar, compartir y trabajar en equipo.',
		meta: { hora: '15:00', lugar: 'Laboratorio de cómputo', para: 'todos los ciclos' },
		image: tallerGit,
		imageAlt: 'Foto de ejemplo: estudiantes ríen mientras trabajan con laptops en una biblioteca',
	},
	{
		id: 'bienvenida-primer-ciclo',
		type: 'comunidad',
		msg: 'feat(bienvenida): aquí nadie empieza solo',
		kind: 'commit',
		stamp: '14 abr 2026',
		title: 'Bienvenida a primer ciclo',
		description:
			'Recibimos a los estudiantes de primer ciclo. Nuestra misión como representantes es asegurar que se sientan escuchados y apoyados desde el primer día.',
		meta: { para: 'primer ciclo' },
	},
	{
		id: 'semana-del-estudiante-2026',
		type: 'evento',
		msg: 'merge(semana-del-estudiante): FLISOL, ponencias, talleres y casas abiertas',
		kind: 'merge',
		stamp: 'feb 2026',
		title: 'Semana del Estudiante 2026',
		description: 'Esto es lo que vivimos durante la semana:',
		branch: {
			name: 'semana-del-estudiante-2026',
			commits: [
				{ id: 'flisol', title: 'FLISOL' },
				{ id: 'ponencias', title: 'Ponencias sobre las últimas tendencias tecnológicas' },
				{ id: 'talleres', title: 'Talleres prácticos: impuestos y cómo potenciar tu CV' },
				{ id: 'casas-abiertas', title: 'Casas abiertas' },
			],
		},
	},
	{
		id: 'fundacion',
		msg: 'init: hola, mundo',
		kind: 'initial',
		stamp: '2020',
		title: 'Nace ASO Computación',
		description: 'Se funda la asociación estudiantil de la carrera de Computación.',
	},
];

// Nearest dated upcoming entry (feeds the countdown panel and the "¡nuevo!" sticker).
export const nextEvent = timeline
	.filter((entry) => entry.kind === 'upcoming' && entry.date)
	.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))[0];

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

// DEMO: extra stock photos used only by the Join collage (see src/assets/demo/SOURCES.md).
export const collagePhotos: { image: ImageMetadata }[] = [
	{ image: colectivoA },
	{ image: colectivoB },
	{ image: colectivoC },
];

// DEMO: frequently asked questions (invented answers; the Instagram DM channel is real). Replace with the board's own
// answers and drop `demo`. `topic` is the slug shown as `git help <topic>`.
export const faq = {
	demo: true,
	title: 'Preguntas frecuentes',
	lead: 'Lo que más nos preguntan sobre la ASO y sus actividades. Si falta algo, escríbenos por mensaje directo.',
	items: [
		{ topic: 'participar', q: '¿Quién puede participar?', a: 'Las actividades están abiertas a cualquier estudiante de Computación, de primer ciclo a último, sin experiencia previa. La directiva, en cambio, es elegida: aquí lo que sí puedes hacer es aportar ideas.' },
		{ topic: 'costo', q: '¿Tiene algún costo?', a: 'Participar en las actividades de la ASO es gratis. Si alguna actividad necesitara un aporte, se avisa de antemano en Instagram.' },
		{ topic: 'avisos', q: '¿Cómo me entero de las actividades?', a: 'Todo se anuncia primero en nuestro Instagram. También publicamos en TikTok y LinkedIn.' },
		{ topic: 'proponer', q: '¿Puedo proponer un taller o una charla?', a: 'Claro, nos encantan. Envíanos tu idea por mensaje directo y la revisamos con la directiva.' },
		{ topic: 'aso', q: '¿Qué hace la ASO por mí?', a: 'Representamos a los estudiantes, organizamos actividades para aprender fuera del aula y acompañamos a quienes llegan a primer ciclo. Tus ideas nos ayudan a hacerlo mejor.' },
		{ topic: 'contacto', q: '¿Cómo contacto a la directiva?', a: 'Por mensaje directo en nuestras redes, sobre todo Instagram. No tenemos correo público.' },
	],
};

interface TeamMember {
	// Public display name: first name + first surname. Never add phone, age, or personal contact data here.
	name: string;
	role: string;
	photo: ImageMetadata;
	// DEMO: playful fields shown in the "git show" panel. Invented placeholders, not real answers;
	// each member (or the board) must provide their own before publishing. Never add age, phone,
	// email, ciclo or personal handles here.
	fun: { language: string; motto: string; demo: true };
}

// Official board order and roles, as provided by the board.
export const team: TeamMember[] = [
	{ name: 'Emilio Jaramillo', role: 'Presidente', photo: emilioJaramillo, fun: { language: 'TypeScript', motto: 'fix: dormir también es un feature', demo: true } },
	{ name: 'Viviana Córdova', role: 'Vicepresidenta', photo: vivianaCordova, fun: { language: 'Python', motto: 'feat: más café, menos bugs', demo: true } },
	{ name: 'Miguel Armas', role: 'Secretario', photo: miguelArmas, fun: { language: 'Java', motto: 'docs: si no está en el acta, no pasó', demo: true } },
	{ name: 'Kiara Condoy', role: 'Tesorera', photo: kiaraCondoy, fun: { language: 'Rust', motto: 'chore: cuadrar las cuentas, otra vez', demo: true } },
	{ name: 'Marco Chiliguano', role: 'Alterno de Vicepresidente', photo: marcoChiliguano, fun: { language: 'JavaScript', motto: 'feat: pulgar arriba para este PR', demo: true } },
	{ name: 'Alejandro Padilla', role: 'Alterno de Tesorero', photo: alejandroPadilla, fun: { language: 'C++', motto: 'style: código limpio, camisa planchada', demo: true } },
	{ name: 'Melissa Contento', role: 'Alterna de Secretaria', photo: melissaContento, fun: { language: 'Go', motto: 'fix: el bug era un punto y coma', demo: true } },
];

interface Social {
	// Short lowercase name, shown like a git remote name.
	remote: string;
	// SVG path (24x24 viewBox) of the brand glyph. LinkedIn is not in the current simple-icons release, so its
	// path is the long-standing Simple Icons (CC0) one.
	icon: string;
	label: string;
	handle: string;
	href: string;
	// Optional short note shown as a red chip (e.g. where announcements land first).
	note?: string;
	// Optional large line shown on the tile (used by the featured tile).
	blurb?: string;
}

export const socials: Social[] = [
	{ remote: 'instagram', icon: siInstagram.path, label: 'Instagram', blurb: 'Eventos, fotos y anuncios, primero aquí.', handle: '@aso_computacion', href: 'https://www.instagram.com/aso_computacion/', note: 'Anunciamos primero aquí' },
	{ remote: 'tiktok', icon: siTiktok.path, label: 'TikTok', handle: '@aso_computacion_unl', href: 'https://www.tiktok.com/@aso_computacion_unl' },
	{ remote: 'linkedin', icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z', label: 'LinkedIn', handle: 'ASO Computación', href: 'https://www.linkedin.com/company/aso-computacion-unl/' },
	{ remote: 'twitch', icon: siTwitch.path, label: 'Twitch', handle: 'ASO_Computacion', href: 'https://www.twitch.tv/aso_computacion' },
];
