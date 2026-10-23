// What the landing components render. The admin payload (types.ts) is mapped into these in map.ts / compose.ts.
import type { ImageMetadata } from 'astro';

// A bundled image (Astro optimizes it from its metadata) or a remote Cloudinary one, which carries the width and
// height the admin reported (see cloudinary.ts and components/Photo.astro).
export type Photo =
	| { src: ImageMetadata; alt: string }
	| { src: string; width: number; height: number; alt: string };

export const activityTypes = ['taller', 'charla', 'evento', 'comunidad'] as const;
export type ActivityType = (typeof activityTypes)[number];

export type TimelineKind = 'next' | 'upcoming' | 'head' | 'commit' | 'merge' | 'initial';

export interface TimelineEntry {
	// Stable slug. Also seeds the decorative short hash shown next to the entry.
	id: string;
	kind: TimelineKind;
	// Red chip above the title: a real date label, or a short word for undated entries.
	stamp?: string;
	title: string;
	description?: string;
	// ISO date (YYYY-MM-DD). The nearest upcoming one feeds the countdown panel.
	date?: string;
	// "month": only the month is confirmed. `date` is then the first of that month, used to order the entry only.
	datePrecision?: 'month';
	// Category used by the activity filter chips. Entries without a type are never dimmed.
	type?: ActivityType;
	// Playful conventional-commit message shown in mono under the title. Never a factual claim.
	msg?: string;
	// Optional feature branch drawn as a second lane between this entry and the next one.
	branch?: { name: string; commits: { id: string; title: string }[] };
	// DEMO CONTENT: placeholder entry (invented title, date and photo), rendered with a "demo" tag.
	demo?: boolean;
	// Practical details, shown in mono. Only what is actually known.
	meta?: { hora?: string; lugar?: string; para?: string };
	// Large photo at the bottom of the card; without it the photo renders as a small square thumbnail.
	featured?: boolean;
	// The photo shown with the card.
	image?: Photo;
	// Every photo of the event (the first one is `image`); feeds the Join collage.
	gallery?: Photo[];
	// Optional link. External URLs (http...) open in a new tab.
	href?: string;
	hrefLabel?: string;
}

export interface Pillar {
	id: string;
	word: string;
	title: string;
	text: string;
	// Without a photo the tile draws the isotype outline instead.
	image?: Photo;
	faces?: boolean;
	demo?: boolean;
}

export interface FaqItem {
	// Slug shown as `git help <topic>`.
	topic: string;
	q: string;
	a: string;
}

// DEMO: playful placeholders for the "git show" panel. Never part of the admin payload (S4).
export interface BoardFun {
	language: string;
	motto: string;
	demo: true;
}

export interface TeamMember {
	// Public display name. Never add phone, age, email or personal handles here (S4).
	name: string;
	role: string;
	photo: Photo;
	fun?: BoardFun;
}

export interface Social {
	// Short lowercase platform id, shown like a git remote name.
	remote: string;
	// SVG path (24x24 viewBox) of the brand glyph.
	icon: string;
	label: string;
	handle: string;
	href: string;
	note?: string;
	blurb?: string;
}

export interface SiteCopy {
	name: string;
	tagline: string;
	headline: string[];
	headlineAccent: number;
	heroCue: string;
	description: string;
	about: string;
}
