import { describe, expect, it } from 'vitest';
import { siInstagram } from 'simple-icons';
import type { ImageMetadata } from 'astro';
import {
	countWord,
	faqTopic,
	slugify,
	toBoard,
	toFaqItems,
	toFreeCommands,
	toPhoto,
	toPillars,
	toSite,
	toSocials,
} from './map';
import { platformIcon } from './platform-icons';
import { image, payload } from './test-fixtures';

const TODAY = '2026-10-22';
const local = (path: string) =>
	({ src: `/@fs${path}`, width: 10, height: 10, format: 'jpg' }) as unknown as ImageMetadata;
const ctx = { today: TODAY, resolveLocal: (path: string) => (path.includes('missing') ? undefined : local(path)) };

describe('toPhoto', () => {
	it('keeps remote images remote, with the dimensions the API reported', () => {
		expect(toPhoto(image({ width: 1600, height: 900 }), ctx)).toEqual({
			src: image().url,
			width: 1600,
			height: 900,
			alt: 'Foto',
		});
	});

	it('resolves bundled images through the resolver', () => {
		const photo = toPhoto(image({ url: '/src/assets/team/a.jpg', alt: 'Foto de A' }), ctx);
		expect(photo).toEqual({ src: local('/src/assets/team/a.jpg'), alt: 'Foto de A' });
	});

	it('fails loudly on a bundled image that does not exist', () => {
		expect(() => toPhoto(image({ url: '/src/assets/team/missing.jpg' }), ctx)).toThrow(/missing\.jpg/);
	});
});

describe('faqTopic', () => {
	it('slugifies the question', () => {
		expect(faqTopic('¿Quién puede participar?')).toBe('quien-puede-participar');
		expect(faqTopic('¿Tiene algún costo?')).toBe('tiene-algun-costo');
	});

	it('cuts long questions at a word boundary', () => {
		const topic = faqTopic('¿Cómo me entero de las actividades?');
		expect(topic).toBe('como-me-entero-de-las');
		expect(topic.length).toBeLessThanOrEqual(28);
	});

	it('survives questions with no letters', () => {
		expect(faqTopic('???')).toBe('faq');
		expect(faqTopic('a'.repeat(60)).length).toBeLessThanOrEqual(28);
	});
});

describe('slugify', () => {
	it('strips accents and punctuation', () => {
		expect(slugify('Talleres prácticos: impuestos y cómo potenciar tu CV')).toBe(
			'talleres-practicos-impuestos-y-como-potenciar-tu-cv',
		);
	});
});

describe('toFaqItems', () => {
	it('maps question/answer to topic/q/a and keeps the order', () => {
		const items = toFaqItems(payload().faqs.concat({ question: '¿Tiene costo?', answer: 'No.' }));
		expect(items).toEqual([
			{ topic: 'quien-puede-participar', q: '¿Quién puede participar?', a: 'Cualquier estudiante.' },
			{ topic: 'tiene-costo', q: '¿Tiene costo?', a: 'No.' },
		]);
	});
});

describe('toFaqItems: commands', () => {
	it('uses the command as the topic when the FAQ has one', () => {
		const [item] = toFaqItems([
			{ question: '¿Cómo me entero de las actividades?', answer: 'Por Instagram.', command: 'actividades' },
		]);
		expect(item.topic).toBe('actividades');
	});

	it('falls back to the auto slug when the command is null or missing', () => {
		const items = toFaqItems([
			{ question: '¿Tiene costo?', answer: 'No.', command: null },
			{ question: '¿Quién puede participar?', answer: 'Todos.' },
		]);
		expect(items.map((item) => item.topic)).toEqual(['tiene-costo', 'quien-puede-participar']);
	});

	it('suffixes a repeated topic and lets the first one win', () => {
		const items = toFaqItems([
			{ question: '¿Tiene costo?', answer: 'a', command: 'costo' },
			{ question: 'Costo', answer: 'b' },
			{ question: 'COSTO?', answer: 'c' },
			{ question: 'Otra', answer: 'd', command: 'costo' },
		]);
		expect(items.map((item) => item.topic)).toEqual(['costo', 'costo-2', 'costo-3', 'costo-4']);
	});
});

describe('toFaqItems: reserved names', () => {
	it('suffixes a FAQ command the shell reserves for its built-ins', () => {
		const items = toFaqItems(
			['help', 'ayuda', 'ls', 'clear'].map((command) => ({ question: `¿${command}?`, answer: 'Sí.', command })),
		);
		expect(items.map((item) => item.topic)).toEqual(['help-2', 'ayuda-2', 'ls-2', 'clear-2']);
	});
});

describe('toFreeCommands', () => {
	const free = (command: string) => ({
		id: command,
		command,
		description: `desc ${command}`,
		output: `out ${command}`,
	});

	it('maps the commands to what the shell runs, in order', () => {
		expect(toFreeCommands([free('whoami'), free('horario')], [])).toEqual([
			{ name: 'whoami', description: 'desc whoami', output: 'out whoami' },
			{ name: 'horario', description: 'desc horario', output: 'out horario' },
		]);
	});

	it('suffixes a name that a FAQ topic or an earlier command already took', () => {
		const result = toFreeCommands([free('costo'), free('horario'), free('horario')], ['costo']);
		expect(result.map((command) => command.name)).toEqual(['costo-2', 'horario', 'horario-2']);
	});

	it('suffixes a name the shell reserves for its built-ins', () => {
		const result = toFreeCommands([free('help'), free('ayuda'), free('ls'), free('clear')], []);
		expect(result.map((command) => command.name)).toEqual(['help-2', 'ayuda-2', 'ls-2', 'clear-2']);
	});
});

describe('toPillars', () => {
	it('uses the photo when there is one and the isotype tile when image is null', () => {
		const [withImage, without] = toPillars(
			[
				{ word: 'VOZ', title: 'Representamos', text: 't', image: image({ alt: 'x' }) },
				{ word: 'APOYO', title: 'Acompañamos', text: 'u', image: null },
			],
			ctx,
		);
		expect(withImage.image).toMatchObject({ src: image().url, alt: 'x' });
		expect(withImage.faces).toBeFalsy();
		expect(without.image).toBeUndefined();
		expect(without.faces).toBe(true);
		expect(without.id).toBe('acompanamos');
	});
});

describe('toSocials', () => {
	it('maps the platform to its glyph and url to href', () => {
		const [instagram] = toSocials([
			{
				platform: 'instagram',
				label: 'Instagram',
				handle: '@aso',
				url: 'https://www.instagram.com/aso/',
				note: 'Primero aquí',
				blurb: 'Fotos.',
			},
		]);
		expect(instagram).toEqual({
			remote: 'instagram',
			icon: siInstagram.path,
			label: 'Instagram',
			handle: '@aso',
			href: 'https://www.instagram.com/aso/',
			note: 'Primero aquí',
			blurb: 'Fotos.',
		});
	});

	it('omits null note and blurb', () => {
		const [social] = toSocials(payload().socials);
		expect('note' in social).toBe(false);
		expect('blurb' in social).toBe(false);
	});

	it('keeps the LinkedIn glyph the landing already used', () => {
		expect(platformIcon('linkedin')).toMatch(/^M20\.447 20\.452h-3\.554v-5\.569/);
		expect(platformIcon('LinkedIn ')).toBe(platformIcon('linkedin'));
	});

	it('knows every platform the admin offers and falls back to a generic glyph for new ones', () => {
		const known = [
			'instagram',
			'tiktok',
			'linkedin',
			'twitch',
			'youtube',
			'github',
			'facebook',
			'x',
			'discord',
			'whatsapp',
		];
		const paths = known.map(platformIcon);
		expect(new Set(paths).size).toBe(known.length);
		const generic = platformIcon('mastodon');
		expect(generic).toMatch(/^M/);
		expect(paths).not.toContain(generic);
		expect(platformIcon('constructor')).toBe(generic);
	});

	it('makes the platform safe to use as a CSS class', () => {
		expect(toSocials([{ ...payload().socials[0], platform: 'My Space!' }])[0].remote).toBe('my-space');
	});
});

describe('toBoard (S4)', () => {
	it('returns exactly name, role and photo', () => {
		const leaky = [{ ...payload().board[0], phone: '0999999999', email: 'a@b.c', age: 22 }];
		const [member] = toBoard(leaky, ctx);
		expect(Object.keys(member).sort()).toEqual(['name', 'photo', 'role']);
		expect(JSON.stringify(member)).not.toMatch(/0999999999|a@b\.c/);
	});

	it('falls back to a readable alt when the photo has none', () => {
		const [member] = toBoard([{ name: 'Ana Pérez', role: 'Presidenta', photo: image({ alt: '' }) }], ctx);
		expect(member.photo.alt).toBe('Foto de Ana Pérez');
	});

	it('attaches playful extras only for names it is given', () => {
		const fun = { language: 'Go', motto: 'm', demo: true as const };
		const [ana, luis] = toBoard(
			[
				{ name: 'Ana Pérez', role: 'A', photo: image() },
				{ name: 'Luis Gómez', role: 'B', photo: image() },
			],
			ctx,
			{ 'Ana Pérez': fun },
		);
		expect(ana.fun).toEqual(fun);
		expect('fun' in luis).toBe(false);
	});
});

describe('toSite', () => {
	const base = {
		name: 'ASO',
		tagline: 'base tagline',
		headline: ['a'],
		headlineAccent: 0,
		heroCue: 'cue',
		description: 'base desc',
		about: 'base about',
	};

	it('keeps the landing copy when settings is null', () => {
		expect(toSite(base, null)).toEqual(base);
	});

	it('overrides tagline, description and about only', () => {
		expect(toSite(base, { tagline: 't', description: 'd', about: 'a' })).toEqual({
			...base,
			tagline: 't',
			description: 'd',
			about: 'a',
		});
	});
});

describe('countWord', () => {
	it('spells small counts and falls back to digits', () => {
		expect(countWord(7)).toBe('siete');
		expect(countWord(12)).toBe('doce');
		expect(countWord(25)).toBe('25');
	});
});
