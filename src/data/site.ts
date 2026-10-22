// Single source of truth for landing content. Edit this file to update the page.

import type { ImageMetadata } from 'astro';

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
	description:
		'Representamos a los estudiantes de Computación: organizamos eventos, talleres y espacios para crecer juntos.',
};

export const navLinks = [
	{ label: 'Nosotros', href: '#nosotros' },
	{ label: 'Actividades', href: '#actividades' },
	{ label: 'Directiva', href: '#directiva' },
	{ label: 'Contacto', href: '#contacto' },
];

export const activities = [
	{
		title: 'Talleres técnicos',
		description: 'Sesiones prácticas sobre programación, herramientas y tecnologías actuales.',
	},
	{
		title: 'Eventos y hackatones',
		description: 'Competencias y encuentros para resolver problemas reales en equipo.',
	},
	{
		title: 'Representación estudiantil',
		description: 'Llevamos la voz de los estudiantes ante las autoridades de la carrera.',
	},
];

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
	label: string;
	handle: string;
	href: string;
}

export const socials: Social[] = [
	{ label: 'Instagram', handle: '@aso_computacion', href: 'https://www.instagram.com/aso_computacion/' },
	{ label: 'TikTok', handle: '@aso_computacion_unl', href: 'https://www.tiktok.com/@aso_computacion_unl' },
	{ label: 'LinkedIn', handle: 'ASO Computación', href: 'https://www.linkedin.com/company/aso-computacion-unl/' },
	{ label: 'Twitch', handle: 'ASO_Computacion', href: 'https://www.twitch.tv/aso_computacion' },
];
