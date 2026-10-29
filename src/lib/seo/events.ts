// schema.org Events of the upcoming activities (S8). Pure: Layout.astro prints what this returns.
import type { Photo, TimelineEntry } from '../admin-content/model';
import { registrationClosed } from '../registration/rules';
import { buildEvent, type JsonLd, type OrganizationInput } from './jsonld';

// The card's id on the home page. Prefixed so an event called "faq" never takes the id of a section.
export const eventAnchor = (slug: string): string => `evento-${slug}`;

export interface EventsPage {
	organization: OrganizationInput;
	// BCP 47 tag of the page.
	inLanguage: string;
	// Canonical URL of the home page the cards are on.
	pageUrl: string;
	// Absolute share image, for an event that has no remote photo (a crawler cannot read a bundled one).
	fallbackImage: string;
	/** @deprecated The form no longer lives on the landing: ignored. Removed with Layout.astro by the parent. */
	openFormShown?: boolean;
	// `Date.now()` of the build: a registration whose deadline already passed is not offered.
	now: number;
}

const remoteUrl = (photo: Photo): string | undefined => (typeof photo.src === 'string' ? photo.src : undefined);

export function eventsStructuredData(entries: readonly TimelineEntry[], page: EventsPage): JsonLd[] {
	return entries.flatMap((entry) => {
		if (entry.kind !== 'upcoming' || !entry.schema) return [];
		const { registration, schema } = entry;
		const open = registration && !registrationClosed(registration.deadline, page.now);
		const image = (entry.gallery ?? []).map(remoteUrl).find((url) => url !== undefined) ?? page.fallbackImage;
		const url = `${page.pageUrl}#${eventAnchor(entry.id)}`;
		return [
			buildEvent({
				organization: page.organization,
				name: entry.title,
				description: entry.description,
				startDate: schema.startDate,
				endDate: schema.endDate,
				location: schema.location,
				image: [image],
				inLanguage: page.inLanguage,
				url,
				registration: open
					? {
							// Both modes register on the admin's event page.
							url: registration.href,
							deadline: registration.deadline,
						}
					: undefined,
			}),
		];
	});
}
