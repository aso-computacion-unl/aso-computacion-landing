// Single source of truth for landing content. Edit this file to update the page.

import type { ImageMetadata } from 'astro';

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
	headline: 'Entérate de lo que pasa en Computación.',
	description:
		'ASO Computación es la asociación estudiantil de la carrera. Aquí está nuestro historial, actividad por actividad.',
	// Verbatim from the ASO's own LinkedIn page.
	about:
		'La Asociación de Estudiantes de la Carrera de Computación (ASO Computación – UNL) es una organización estudiantil que representa a la comunidad de futuros profesionales en tecnologías de la información de la Universidad Nacional de Loja.',
};

export const navLinks = [
	{ label: 'Actividades', href: '#actividades' },
	{ label: 'Nosotros', href: '#nosotros' },
	{ label: 'Directiva', href: '#directiva' },
	{ label: 'Síguenos', href: '#redes' },
];

export type TimelineKind = 'next' | 'upcoming' | 'head' | 'commit' | 'merge' | 'initial';

interface TimelineEntry {
	// Stable slug. Also seeds the decorative short hash shown next to the entry.
	id: string;
	kind: TimelineKind;
	// Red chip above the title. Use a real date label, or a short word for undated entries.
	stamp?: string;
	title: string;
	description?: string;
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
		kind: 'commit',
		stamp: '14 abr 2026',
		title: 'Bienvenida a primer ciclo',
		description:
			'Recibimos a los estudiantes de primer ciclo. Nuestra misión como representantes es asegurar que se sientan escuchados y apoyados desde el primer día.',
		meta: { para: 'primer ciclo' },
	},
	{
		id: 'semana-del-estudiante-2026',
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
		kind: 'initial',
		stamp: '2020',
		title: 'Nace ASO Computación',
		description: 'Se funda la asociación estudiantil de la carrera de Computación.',
	},
];

// DEMO: ways to get involved (invented copy). Replace with the board's real invitation, then drop `demo`.
export const join = {
	demo: true,
	steps: [
		{ title: 'Entérate', text: 'Síguenos en Instagram: ahí anunciamos primero cada actividad.' },
		{ title: 'Participa', text: 'Ven a un taller, una charla o un torneo y conoce a otros estudiantes.' },
		{ title: 'Propón', text: '¿Tienes una idea para un taller o una charla? Cuéntanosla por mensaje directo.' },
	],
};

// DEMO: newcomer block for first-cycle students (invented copy; the Instagram DM channel is real).
// Replace with the board's own words, then drop `demo`.
export const firstCommit = {
	demo: true,
	title: 'Tu primer commit',
	lead: 'Un commit es un punto en esta historia. Tu primera actividad con nosotros será el tuyo.',
	steps: [
		{
			title: 'Al principio nadie conoce a nadie',
			text: 'Es normal. Llega, saluda y quédate a ver: nadie espera que ya sepas cómo funciona todo.',
		},
		{
			title: 'No necesitas experiencia previa',
			text: 'Hay actividades para primer ciclo y para todos los ciclos. Pregunta lo que quieras.',
		},
		{
			title: 'Escríbenos por Instagram',
			text: 'Mándanos un mensaje directo y te contamos cuál es la próxima actividad y dónde nos vemos.',
		},
	],
	cta: 'Escribir por Instagram',
};

interface TeamMember {
	// Public display name: first name + first surname. Never add phone, age, or personal contact data here.
	name: string;
	role: string;
	photo: ImageMetadata;
}

// Official board order and roles, as provided by the board.
export const team: TeamMember[] = [
	{ name: 'Emilio Jaramillo', role: 'Presidente', photo: emilioJaramillo },
	{ name: 'Viviana Córdova', role: 'Vicepresidenta', photo: vivianaCordova },
	{ name: 'Miguel Armas', role: 'Secretario', photo: miguelArmas },
	{ name: 'Kiara Condoy', role: 'Tesorera', photo: kiaraCondoy },
	{ name: 'Marco Chiliguano', role: 'Alterno de Vicepresidente', photo: marcoChiliguano },
	{ name: 'Alejandro Padilla', role: 'Alterno de Tesorero', photo: alejandroPadilla },
	{ name: 'Melissa Contento', role: 'Alterna de Secretaria', photo: melissaContento },
];

interface Social {
	// Short lowercase name, shown like a git remote name.
	remote: string;
	label: string;
	handle: string;
	href: string;
	// Optional short note shown as a red chip (e.g. where announcements land first).
	note?: string;
}

export const socials: Social[] = [
	{ remote: 'instagram', label: 'Instagram', handle: '@aso_computacion', href: 'https://www.instagram.com/aso_computacion/', note: 'Anunciamos primero aquí' },
	{ remote: 'tiktok', label: 'TikTok', handle: '@aso_computacion_unl', href: 'https://www.tiktok.com/@aso_computacion_unl' },
	{ remote: 'linkedin', label: 'LinkedIn', handle: 'ASO Computación', href: 'https://www.linkedin.com/company/aso-computacion-unl/' },
	{ remote: 'twitch', label: 'Twitch', handle: 'ASO_Computacion', href: 'https://www.twitch.tv/aso_computacion' },
];
