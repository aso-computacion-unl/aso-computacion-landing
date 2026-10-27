// Test-only builders for the admin's public payload (shape: GET /api/public/content, version 1).
import type {
	PublicContent,
	PublicEventRegistration,
	PublicEventStructuredData,
	PublicImage,
	PublicImpactStat,
	PublicNewsItem,
	PublicSponsor,
	PublicTestimonial,
} from './types';

export const image = (overrides: Partial<PublicImage> = {}): PublicImage => ({
	url: 'https://res.cloudinary.com/demo/image/upload/v1/aso/photo.jpg',
	width: 1200,
	height: 800,
	alt: 'Foto',
	...overrides,
});

export const newsItem = (overrides: Partial<PublicNewsItem> = {}): PublicNewsItem => ({
	slug: 'taller-de-git-2026',
	title: 'Taller de Git 2026',
	summary: 'Abrimos inscripciones para el taller de Git.',
	body: 'Primer párrafo con **negrita**.\n\n- Uno\n- Dos',
	publishedAt: '2026-10-20',
	cover: {
		url: 'https://res.cloudinary.com/demo/image/upload/v1/aso/news.jpg',
		width: 1200,
		height: 800,
		alt: 'Cartel del taller',
	},
	...overrides,
});

export const impactStat = (overrides: Partial<PublicImpactStat> = {}): PublicImpactStat => ({
	value: '120+',
	label: 'estudiantes en nuestras actividades',
	...overrides,
});

export const testimonial = (overrides: Partial<PublicTestimonial> = {}): PublicTestimonial => ({
	quote: 'Aprendí Git en un taller y ya lo uso en todos mis proyectos.',
	name: 'Luis Torres',
	role: 'Estudiante de segundo ciclo',
	photo: {
		url: 'https://res.cloudinary.com/demo/image/upload/v1/aso/testimonials/luis.jpg',
		width: 600,
		height: 600,
		alt: 'Retrato de Luis Torres',
	},
	...overrides,
});

export const sponsor = (overrides: Partial<PublicSponsor> = {}): PublicSponsor => ({
	name: 'Ejemplo S.A.',
	logo: {
		url: 'https://res.cloudinary.com/demo/image/upload/v1/aso/sponsors/ejemplo.png',
		width: 400,
		height: 200,
		alt: 'Logo de Ejemplo S.A.',
	},
	url: 'https://ejemplo.test/',
	...overrides,
});

// The admin's S8 fields for one event. `open` is the form the landing hosts; `unl` is a page on the admin.
export const openRegistration = (overrides: Partial<PublicEventRegistration> = {}): PublicEventRegistration => ({
	mode: 'open',
	capacity: 40,
	deadline: '2026-11-12T15:00:00.000Z',
	url: null,
	endpoint: 'https://admin.example.test/api/public/events/taller-de-git/registrations',
	...overrides,
});

export const unlRegistration = (overrides: Partial<PublicEventRegistration> = {}): PublicEventRegistration => ({
	mode: 'unl',
	capacity: null,
	deadline: null,
	url: 'https://admin.example.test/foro/eventos/taller-de-git',
	endpoint: null,
	...overrides,
});

export const structuredData = (overrides: Partial<PublicEventStructuredData> = {}): PublicEventStructuredData => ({
	startDate: '2026-11-12T15:00:00-05:00',
	endDate: '2026-11-12T17:00:00-05:00',
	location: 'Laboratorio',
	registrationUrl: null,
	...overrides,
});

export const payload = (overrides: Partial<PublicContent> = {}): PublicContent => ({
	version: 1,
	generatedAt: '2026-10-22T12:00:00.000Z',
	events: [
		{
			slug: 'taller-de-git',
			title: 'Taller de Git',
			description: 'Control de versiones desde cero.',
			date: '2026-11-12',
			datePrecision: 'day',
			type: 'taller',
			commitMessage: 'feat(taller): git init',
			hora: '15:00',
			lugar: 'Laboratorio',
			para: 'primer ciclo',
			featured: true,
			linkUrl: 'https://example.com/inscripcion',
			linkLabel: 'Inscribirme',
			highlights: [],
			photos: [image()],
			registration: null,
			calendarUrl: null,
			structuredData: null,
		},
	],
	faqs: [{ question: '¿Quién puede participar?', answer: 'Cualquier estudiante.', command: null }],
	pillars: [{ word: 'VOZ', title: 'Representamos', text: 'Texto.', image: image() }],
	socials: [
		{
			platform: 'instagram',
			label: 'Instagram',
			handle: '@aso',
			url: 'https://www.instagram.com/aso/',
			note: null,
			blurb: null,
		},
	],
	board: [{ name: 'Ana Pérez', role: 'Presidenta', photo: image({ alt: 'Foto de Ana Pérez' }) }],
	settings: { tagline: 'Tagline', description: 'Descripción', about: 'Acerca de' },
	news: [],
	commands: [],
	impact: [],
	testimonials: [],
	sponsors: [],
	...overrides,
});
