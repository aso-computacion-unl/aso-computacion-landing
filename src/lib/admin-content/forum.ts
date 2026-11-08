// Where the forum lives: on the admin's origin, at `/foro`. The landing links there and never handles what people type
// (the sign-in is the admin's), so the origin is only ever the one the content itself comes from: the origin of
// ADMIN_CONTENT_URL (of ADMIN_PREVIEW_URL in a preview build), under the same scheme rule as the registration links
// (validate.ts): https, or plain http for a local admin. Anything else is no origin, and the forum link is left out.
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

export const FORUM_PATH = '/foro';
export const EVENTS_PATH = `${FORUM_PATH}/eventos`;
export const REGISTRATION_PATH = '/inscripciones';

// The origin (`https://host[:port]`) of a configured admin URL, or undefined when it is unset, unparseable or unsafe.
export function adminOriginOf(url: string | undefined): string | undefined {
	const target = url?.trim();
	if (!target) return undefined;
	let parsed: URL;
	try {
		parsed = new URL(target);
	} catch {
		return undefined;
	}
	if (parsed.username || parsed.password) return undefined;
	const local = parsed.protocol === 'http:' && LOCAL_HOSTS.includes(parsed.hostname);
	return parsed.protocol === 'https:' || local ? parsed.origin : undefined;
}

// The forum's home on that origin; undefined (no link) when the origin is not known.
export const forumUrl = (origin: string | undefined): string | undefined =>
	origin ? `${origin}${FORUM_PATH}` : undefined;

// The list of every event (and its sign-up) on that origin; undefined (no link) when the origin is not known.
export const eventsUrl = (origin: string | undefined): string | undefined =>
	origin ? `${origin}${EVENTS_PATH}` : undefined;

// The page of one event on that origin (`/inscripciones/<slug>`, its own route outside the forum): where both
// registration modes sign up, and the only place the landing sends a visitor who wants a seat. The slug is encoded, so
// it can never leave its path segment.
export const eventUrl = (origin: string | undefined, slug: string): string | undefined =>
	origin ? `${origin}${REGISTRATION_PATH}/${encodeURIComponent(slug)}` : undefined;
