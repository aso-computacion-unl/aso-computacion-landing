// Pure mapping from the admin's public payload to the models the landing components render. No Astro runtime and no
// I/O: the bundled-image lookup is passed in, so every rule here is unit-testable. Events live in timeline.ts.
import type { ImageMetadata } from 'astro';
import type { BoardFun, FaqItem, Photo, Pillar, SiteCopy, Social, TeamMember } from './model';
import { platformIcon } from './platform-icons';
import type {
	PublicBoardMember,
	PublicFaq,
	PublicImage,
	PublicPillar,
	PublicSiteSettings,
	PublicSocial,
} from './types';

export interface MapContext {
	// YYYY-MM-DD in the ASO's time zone. A date on or after it is an upcoming event.
	today: string;
	// Finds a bundled image for a fallback `/src/assets/...` reference.
	resolveLocal: (path: string) => ImageMetadata | undefined;
}

export const slugify = (text: string): string =>
	text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

const TOPIC_MAX = 28;

// The admin's FAQ has no topic, so `git help <topic>` is the question as a slug, cut at a word boundary.
export const faqTopic = (question: string): string => {
	const slug = slugify(question);
	if (slug === '') return 'faq';
	if (slug.length <= TOPIC_MAX) return slug;
	const head = slug.slice(0, TOPIC_MAX);
	const cut = slug[TOPIC_MAX] === '-' ? head : head.slice(0, Math.max(head.lastIndexOf('-'), 0)) || head;
	return cut.replace(/-+$/, '');
};

export const toPhoto = (image: PublicImage, ctx: MapContext): Photo => {
	if (image.url.startsWith('/src/')) {
		const src = ctx.resolveLocal(image.url);
		if (!src) throw new Error(`fallback.json references a missing bundled image: ${image.url}`);
		return { src, alt: image.alt };
	}
	return { src: image.url, width: image.width, height: image.height, alt: image.alt };
};

export const isRemote = (photo: Photo): photo is Extract<Photo, { src: string }> => typeof photo.src === 'string';

// Props for Astro's <Image>. Bundled images take the box the component asks for; remote ones use the width and
// height the admin reported, so Astro never has to download an image just to measure it.
export const imageProps = (photo: Photo, box: { width: number; height: number }) =>
	isRemote(photo)
		? { src: photo.src, alt: photo.alt, width: photo.width, height: photo.height }
		: { src: photo.src, alt: photo.alt, width: box.width, height: box.height };

export const toFaqItems = (faqs: readonly PublicFaq[]): FaqItem[] =>
	faqs.map((faq) => ({ topic: faqTopic(faq.question), q: faq.question, a: faq.answer }));

export const toPillars = (pillars: readonly PublicPillar[], ctx: MapContext): Pillar[] =>
	pillars.map((pillar) => ({
		id: slugify(pillar.title) || 'pilar',
		word: pillar.word,
		title: pillar.title,
		text: pillar.text,
		...(pillar.image ? { image: toPhoto(pillar.image, ctx) } : { faces: true }),
	}));

export const toSocials = (socials: readonly PublicSocial[]): Social[] =>
	socials.map((social) => ({
		remote: slugify(social.platform) || 'link',
		icon: platformIcon(social.platform),
		label: social.label,
		handle: social.handle,
		href: social.url,
		...(social.note ? { note: social.note } : {}),
		...(social.blurb ? { blurb: social.blurb } : {}),
	}));

// S4: a member is built from name, role and photo and nothing else. `extras` are the landing's own demo placeholders,
// keyed by name; they never come from the payload.
export const toBoard = (board: readonly PublicBoardMember[], ctx: MapContext, extras: Record<string, BoardFun> = {}): TeamMember[] =>
	board.map((member) => {
		const photo = toPhoto(member.photo, ctx);
		return {
			name: member.name,
			role: member.role,
			photo: { ...photo, alt: photo.alt || `Foto de ${member.name}` },
			...(Object.hasOwn(extras, member.name) ? { fun: extras[member.name] } : {}),
		};
	});

// `settings: null` means the admin never saved them: keep the landing's own copy.
export const toSite = (base: SiteCopy, settings: PublicSiteSettings | null): SiteCopy =>
	settings ? { ...base, tagline: settings.tagline, description: settings.description, about: settings.about } : base;

const COUNT_WORDS = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'];

export const countWord = (count: number): string => COUNT_WORDS[count] ?? String(count);
