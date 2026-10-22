// Test-only builders for the admin's public payload (shape: GET /api/public/content, version 1).
import type { PublicContent, PublicImage } from './types';

export const image = (overrides: Partial<PublicImage> = {}): PublicImage => ({
	url: 'https://res.cloudinary.com/demo/image/upload/v1/aso/photo.jpg',
	width: 1200,
	height: 800,
	alt: 'Foto',
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
		},
	],
	faqs: [{ question: '¿Quién puede participar?', answer: 'Cualquier estudiante.' }],
	pillars: [{ word: 'VOZ', title: 'Representamos', text: 'Texto.', image: image() }],
	socials: [{ platform: 'instagram', label: 'Instagram', handle: '@aso', url: 'https://www.instagram.com/aso/', note: null, blurb: null }],
	board: [{ name: 'Ana Pérez', role: 'Presidenta', photo: image({ alt: 'Foto de Ana Pérez' }) }],
	settings: { tagline: 'Tagline', description: 'Descripción', about: 'Acerca de' },
	...overrides,
});
