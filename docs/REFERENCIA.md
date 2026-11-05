> Referencia técnica de la landing: cómo se arma el contenido, el fallback y el mapeo. Para empezar, lea el [README](../README.md).

# ASO Computación — Landing Page

Landing page for the student association of the Computer Science program.

Built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com).

This file covers the landing only. How the landing and the admin fit together (data flow, build triggers, the public API,
registration, roles) is in the system architecture of the admin repository:
[docs/ARQUITECTURA.md](https://github.com/aso-computacion-unl/aso-computacion-admin/blob/main/docs/ARQUITECTURA.md).

## Getting started

```sh
pnpm install
pnpm dev       # http://localhost:4321
pnpm build     # output in ./dist
pnpm preview
pnpm test          # vitest (unit)
pnpm test:coverage # vitest with V8 coverage; fails under the thresholds in vitest.config.ts
pnpm test:e2e      # Playwright, against `astro preview` of the last build (see Tests)
pnpm lighthouse    # Lighthouse CI, same build
pnpm lint          # ESLint
pnpm check         # astro check (types)
pnpm format        # Prettier (format:check in CI; Markdown files are not formatted)
pnpm verify:dist   # SEO and hosting files of the last build (see SEO and sharing)
```

CI runs the same gates on every pull request: see [Quality gates](#quality-gates).

## Content from the admin

Events, news, FAQ, pillars, socials, the board and the site copy are managed in the admin
(`aso-computacion-admin`). The landing is static: it reads that content **at build time** and
bakes it into the HTML, so a change in the admin shows up after the next build (the admin
triggers one through a deploy hook, plus a daily rebuild as a safety net).

> **Schedule the daily rebuild after 05:00 UTC.** "Today" (which decides what is an upcoming
> event) is fixed at build time, in Ecuador time (UTC-5). A rebuild before 05:00 UTC still sees
> the previous day in Ecuador, so an event would stay "upcoming" a day too long.

| Variable | Where | What |
| --- | --- | --- |
| `ADMIN_CONTENT_URL` | build environment | Full URL of the admin's `GET /api/public/content`, for example `https://your-admin.vercel.app/api/public/content`. See `.env.example`. |
| `PRODUCTION_BRANCH` | build environment | Branch whose builds count as production for the content gate. Defaults to `main`. Compared with `CF_PAGES_BRANCH`, which Cloudflare Pages sets. |
| `ALLOW_CONTENT_FALLBACK` | build environment | `1` (or `true`) downgrades the production gate failure to a warning, for an emergency deploy. Any other value is ignored. |
| `PUBLIC_CF_BEACON_TOKEN` | build environment | Token of the site in Cloudflare Web Analytics. Optional: when set, `Layout.astro` adds Cloudflare's cookie-free beacon (`<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"..."}'>`); when unset, nothing is rendered (`src/lib/analytics.ts`). Not secret: it ends up in the page. Preview builds never carry it. |

```sh
ADMIN_CONTENT_URL=https://your-admin.vercel.app/api/public/content pnpm build
```

The preview variables (`PREVIEW_BUILD`, `PREVIEW_TOKEN`, `ADMIN_PREVIEW_URL`, `PUBLIC_PAGES_PROJECT`) are listed under
"Preview builds" below.

The landing reads no Turnstile variable any more (`PUBLIC_TURNSTILE_SITE_KEY` is gone): the Turnstile keys belong to the
admin, which hosts the registration form. See "Event registration".

Alternative to the variable: enable Web Analytics in the Cloudflare Pages project (Settings → Web Analytics), which
injects the beacon by itself. In that case leave `PUBLIC_CF_BEACON_TOKEN` unset, or visits are counted twice.

On Cloudflare Pages, set them under Settings → Environment variables. They are read once when the
build (or `pnpm dev`) starts, so restart the dev server after changing one. One exception for content in `pnpm dev`: a
server that started while the admin was down (or answered an error) keeps the fallback, but asks the admin again, at most every
5 seconds, on the next request and switches to its content as soon as it answers
(`src/middleware.ts`, `shouldRetryLoad` in `src/lib/admin-content/refresh.ts`). A build never does this: it resolves the
content once.

See [DEPLOY.md](DEPLOY.md) for the Cloudflare Pages setup, the deploy hook, the daily
rebuild workflow and a first-deploy checklist.

### The loader never throws; the production gate decides

The fetch has a 10 second timeout and the payload is validated against the version 1 shape
(`src/lib/admin-content/validate.ts`). On **any** of these, the loader uses the committed
`src/data/fallback.json` instead of throwing:

- `ADMIN_CONTENT_URL` is unset, blank or not a URL
- network error or timeout
- a status other than 200
- invalid JSON, a payload that does not match the shape, or a `version` other than `1`
- an image URL that is not `https://res.cloudinary.com/<cloud>/image/upload/[v<digits>/]<path>`
  (another host, `/video/upload/`, `http`, a stored transformation such as `c_fill,w_100`, or `..`,
  `%2e`, `?` or `#` in the path), or an image `width`/`height` that is not an integer from 1 to 10000
- a `linkUrl` or social `url` that is not `https`
- an invalid `news` item: see "News" below. A payload with no `news` key at all is fine: it means
  no news (an admin that does not send the field yet)
- a string or an array over its cap (text up to 2000 characters, titles 240, at most 100
  events, 12 photos per event and 50 FAQs, pillars, socials or board members)

Whether that build may ship is decided by the **content gate** (`src/lib/admin-content/gate.ts`, a pure
function run once per build from `src/data/content.ts`):

| Build | Fallback or demo content | Result |
| --- | --- | --- |
| Production (`CF_PAGES_BRANCH` equals `PRODUCTION_BRANCH`, default `main`) | none | ok |
| Production | yes | **fails** with one `[content-gate]` line (reason, admin host, "the previous deployment stays live") |
| Production with `ALLOW_CONTENT_FALLBACK=1` | yes | continues, multi-line `[content-gate] WARNING` |
| Anything else: local, GitHub CI, Pages preview branches | yes | continues, multi-line `[content-gate] WARNING` with the reason |

"Demo content" is what the composed pages would render with a demo flag: events, pillars, FAQ or
board extras. Only the admin host is ever printed, never the path, query or a token. Two blocks of
landing-owned copy are still flagged `demo`: the join section (`join` in `src/data/site.ts`, pending board approval) and the
forum teaser's example threads (`forum`, see "Forum teaser" below). Each is reported as a separate
`[content-gate] Note` and does not fail production until its switch, `STRICT_JOIN` or `STRICT_FORUM` in `src/data/content.ts`,
is turned on (see [DEPLOY.md](DEPLOY.md#when-the-admin-is-down) for the runbook).

Images are never downloaded at build time, so no image can fail the build (see Photos below).

Only keys in the documented shape are kept; anything else in the response is dropped. In
particular a board member is rebuilt from `name`, `role` and `photo` and nothing more.

### The fallback snapshot

`src/data/fallback.json` has the same shape as the API and holds the real (non-demo) content:
events, socials and the board. It points at images bundled in `src/assets/` (`/src/assets/...`),
never at remote URLs, so the fallback path needs no network. `settings: null` means "keep the
copy in `src/data/site.ts`". Update the snapshot by hand when real content changes and the
admin is expected to be down; `pnpm test` checks that it is valid and that its images exist.

Placeholder (demo) content lives in `src/data/site.ts`. The admin-backed placeholders are shown **only on the fallback
path** (a production build refuses that path, see above): demo events are merged into the timeline by date, and demo FAQ items and pillars fill
in while the snapshot has none. When the admin answers, its content is the whole truth: a
section with nothing to show is left out. The two landing-owned demo blocks, the join section and the forum teaser's example
threads, render on every build with a "demo" tag until they are approved or replaced (see the gate above).

### Forum teaser

The *Foro* section (`src/components/Forum.astro`, after Novedades) is a door to the forum, which lives on the admin, not a
forum. It shows three example thread titles (category and title, no tabs, no feed and no script), each a link to the forum, a
"Ver todos los hilos" button and the sign-in card with "Entrar con Google", the only way in. The threads are invented,
`forum.demo: true` in `src/data/site.ts`, tagged "demo" (`STRICT_FORUM` in `src/data/content.ts` makes production refuse them once it is turned on). The button
opens `<admin>/foro` in a new tab (`forumUrl` in `src/lib/admin-content/forum.ts`, built from the admin's origin in
`src/data/content.ts`); with no known or safe admin origin the button is left out (fail closed, like the registration links).
The landing sends nothing to the forum and holds no sign-in.

### How the admin content maps to the page

- **Events** become timeline entries. The kind comes from the date (Ecuador time) at build
  time: on or after today is `upcoming`, earlier is a `commit`, a past event with
  `highlights` is a `merge` (the highlights are its feature branch), and an event without a
  date is a `commit` listed last. The `next`, `HEAD` and `initial` entries stay in
  `src/data/site.ts`.
- **Month-only dates**: an event may carry `datePrecision: "month"` (optional, default
  `"day"`; any other value makes the payload invalid). Its chip reads "feb 2026", never a day.
  For ordering and for upcoming/past it counts as the first of that month, and it never feeds
  the countdown panel. The `date` still has to be a full `YYYY-MM-DD`; its day is ignored.
- **News** (`news`, newest `publishedAt` first) become the Novedades section of the home, the
  `/novedades` list and one page per item. See "News" below.
- **Socials** `platform` picks a Simple Icons glyph; an unknown platform gets a generic one.
- **Pillars** without an image show the isotype tile.
- **Social proof** (`impact`, `testimonials`, `sponsors`, S9). All three are validated and mapped
  (`validate.ts`, `compose.ts`), but **the Taquilla home renders only the sponsors**, as *Aliados* (the
  last section, `src/components/Sponsors.astro`: logos on a white tile, wrapped in an external link only when
  the sponsor has an https `url`). The *Impacto* (big numbers) and *Testimonios* (quote cards) sections of the
  first version are gone from the page: `HomePage.astro` has no component for them, and
  `e2e/built-from-admin.spec.ts` asserts that `#impacto` and `#testimonios` never exist even when the admin sends
  both. The keys stay in the contract, so an admin that still sends them keeps working. The keys are additive to
  `version` 1: a payload without them (an admin from before S9) reads as three empty lists, and **Aliados is left out
  when the list is empty**. Text is plain text and is escaped on render. A testimonial photo and every logo must have
  alt text and be Cloudinary images, a sponsor link must be https, and each list holds at most 50 entries; anything
  else makes the whole payload invalid. Only the documented keys are copied, so nothing else about a person can reach
  the page. There is **no demo set**: the fallback snapshot has none, so the fallback build (and CI's axe and
  Lighthouse runs) never show Aliados; `e2e/built-from-admin.spec.ts` builds against a mock admin to cover it. The
  section is static (no scroll animation), so reduced motion needs nothing; only the hover lift of a linked logo sits
  behind `prefers-reduced-motion`. It has no header link.
- **FAQ**: the home shows the FAQ as a plain accordion (`src/components/Faq.astro`, one `<details>` per question), so the
  section, and its nav link, are left out when there are no items. Each `faqs[]` item may still carry a `command` (without
  one the topic is the question as a slug, cut at 28 characters, `TOPIC_MAX` in `map.ts`) and the payload's `commands` (id,
  `command`, one-line `description`, multi-line `output`, at most 50) are still validated and mapped
  (`src/lib/admin-content/map.ts`), but nothing renders them since the FAQ terminal left the home: commands alone no longer
  keep the section or its link.
- **Registration, calendar and structured data** (`registration`, `calendarUrl`, `structuredData` on each event, S8) add the
  ticket's action, its live seats, the `.ics` link and the Event JSON-LD to upcoming events. See "Event registration" below.
  The keys are additive to `version` 1: an event from an admin that predates them reads as `null` in all three and shows
  none of it.
- **Settings** `tagline`, `description` and `about` replace the landing copy when present. `about` is Nosotros' statement:
  its key phrases (`aboutStatement.accents` in `src/data/site.ts`) are painted in sky, and a text over 120 characters drops
  from display type to the lead size. Without it the statement is the short fallback sentence in `site.about`.
- **Photos**: admin images are plain `<img>` tags served by Cloudinary. The build inserts a
  delivery transformation after `/image/upload/` (`f_auto,q_auto,c_limit,w_<n>`, see
  `src/lib/admin-content/cloudinary.ts`) and writes a `srcset` with two or three widths, the
  `width`/`height` the admin reports, `loading="lazy"` and `decoding="async"`. Cloudinary
  resizes and re-encodes on first request, so the build downloads nothing. Bundled images (the
  fallback snapshot and the demo placeholders) still go through Astro's image pipeline. Both
  paths render through `src/components/Photo.astro`. Board photos appear only in the Directiva
  section.

### Preview builds

A preview build shows what the admin has not published yet (drafts and scheduled items) so an editor can check it
before it goes live. It is **opt-in** and never the production site. The admin filters publish windows itself
(`/api/public/content` already hides scheduled and expired items), so the landing computes no window: a normal build
changes nothing, and a preview build just reads another endpoint, `GET /api/public/preview`.

| Variable | What |
| --- | --- |
| `PREVIEW_BUILD` | `1` (or `true`) turns the preview mode on. Without it every other variable here is ignored, even `PREVIEW_TOKEN`. |
| `PREVIEW_TOKEN` | The code from the admin's `/admin/vista-previa` (valid 1 hour, 24 hours or 7 days). Secret: a build secret, never in the page or the URL. |
| `ADMIN_PREVIEW_URL` | Full URL of the admin's `GET /api/public/preview`. Must be https (http only for `localhost`/`127.0.0.1`), because the token travels with it. |
| `PUBLIC_PAGES_PROJECT` | Name of the public Cloudflare Pages project. Required for a preview build on Cloudflare Pages (`CF_PAGES=1`): the build fails if it runs on that project, or if this is unset. Not needed locally. |

The build sends the token in the `X-Preview-Token` header only, uncached and without following redirects, from the
server side of the build. It **stops** (exit code 1, no site produced) when the token is missing, the admin answers
`401` (invalid or expired token), answers anything but `200`, the response lacks `preview: true`, its `schemaVersion`
is not 1, or the payload fails the same validation as the public one. It never falls back to normal content. Error
messages never contain the token or the URL.

What a preview build adds, and removes:

- A fixed bar at the bottom of every page: **«Vista previa — no publicar»** (English: "Preview — do not publish").
- `noindex, nofollow` in a meta tag, `robots.txt` with `Disallow: /` and no sitemap, and an `X-Robots-Tag: noindex, nofollow`
  rule appended to `_headers` (so images, RSS and other files carry it too).
- No Cloudflare Web Analytics beacon, so previews do not count as visits.

Run it locally (nothing is deployed):

```sh
PREVIEW_BUILD=1 \
PREVIEW_TOKEN=<code from /admin/vista-previa> \
ADMIN_PREVIEW_URL=https://your-admin.vercel.app/api/public/preview \
pnpm build && pnpm preview
```

The token expires, so a `401` just means "mint another one". Use `--outDir` if you want to keep `dist/` as it is.
Never copy a preview build into the production project. See [DEPLOY.md](DEPLOY.md#preview-builds) for a separate,
non-public Cloudflare Pages project.

### Event registration

Which way an event takes sign-ups is decided in the admin (`registration.mode`); **the sign-up itself happens on the
admin's event page, `<admin>/foro/eventos/<slug>`**, for both modes. The landing has no registration form: it shows the
ticket and links there. Everything below applies to **upcoming** events (dated today or later, Ecuador time): a past event
shows no registration, no calendar link and no structured data.

| Admin says | The ticket (Inscripciones) shows |
| --- | --- |
| `registration: null` (mode none, or an older admin) | A **pase libre**: no seats, no action, only its calendar link. |
| `mode: "unl"` | "Boleto 00N", "Con cuenta UNL" and the action "Inscribirme" to `<admin>/foro/eventos/<slug>` (same tab). The student signs in with their UNL account there. |
| `mode: "open"` | The same ticket, "Con formulario": the action goes to the same page, where the open form (name, email, career, semester, Turnstile) lives. |
| `capacity`, `deadline` | The capacity before the seats arrive, and "Cierra en N días · <date> (hora de Ecuador)" (or "Sin fecha límite"). |
| a `deadline` already passed at build time, or by the visitor's clock | "Inscripciones cerradas" and an action that goes nowhere (`aria-disabled`, no `href`). The page is built ahead of time, so `src/scripts/ticket-deadline.ts` checks again in the browser. |
| `calendarUrl` | "Añadir al calendario · .ics", a link to the admin's file (it sends `Content-Disposition: attachment`). |

The cards of **Actividades** link to their ticket ("Ver el boleto de inscripción", `#inscripciones-<slug>`) and offer the
calendar file; they hold no form either. Every link to a ticket action or a calendar file ends, for assistive technology, with
the activity's title, so a list of links tells the tickets apart.

`src/lib/admin-content/timeline.ts` builds the page URL with `eventUrl()` (`src/lib/admin-content/forum.ts`) from the admin's
origin and the event's slug; the payload's own `url` / `endpoint` are only where that origin is read from. A registration with no
usable origin is dropped: there is nowhere to send the person.

**Live seats** (`src/lib/registration/seats.ts`, `src/scripts/seats.ts`). When the home loads, the browser asks once
`GET <admin>/api/public/events/seats` (no credentials, 4 s timeout; the address is `data-seats-url` on the Inscripciones
section, only when the admin's origin is known). The admin answers `{ events: [{ slug, capacity, registered, seatsLeft, status }] }`,
`status` being `open`, `full` or `closed`, with open CORS (counts and slugs only). Each ticket shows "N cupos libres de M" with a
meter and an "en vivo" mark (the numbers came from the admin, not from the build), "Sin cupos" for `full` and "Inscripciones
cerradas" for `closed`; an event with no capacity shows its state alone. Whatever else happens (offline, slow, an answer
that is not the contract) changes nothing: the ticket keeps the capacity it was built with and its action, and the admin stays
the authority when someone signs up. The room for the meter is held until the answer (or the timeout) settles, so the
tickets do not jump.

**Links must be on the admin's origin.** A payload can only send people to the host the content came from: the origin of
`ADMIN_CONTENT_URL` (of `ADMIN_PREVIEW_URL` in a preview build). The forum, the seats request and every ticket action are built
from that origin, and are left out when it is not known or not safe (https, or plain http for `localhost` / `127.0.0.1`). A
`registration` whose `url` or `endpoint` is on any other origin (another host, subdomain, port or scheme, or a `user@host` trick),
a `calendarUrl`, and a `structuredData.registrationUrl` are each **left out** (that event shows no registration, no calendar
link, no offer) while the rest of the payload stays valid, and the build prints `[registration] events[N] (<slug>): the
registration link is not on the admin origin (...) and was left out.` If the origin is not known, all of them are left out (fail
closed). This is defence in depth against a compromised or misconfigured admin, on top of https-only validation
(`src/lib/admin-content/validate.ts`, `ParseOptions.adminOrigin`; `parsePublicContent` returns these as `warnings`).

**Validation of the three keys** (`src/lib/admin-content/validate.ts`, additive to `version` 1; a rejected value makes the
whole payload invalid like any other field): `registration` is `null` or `{ mode: "unl" | "open", capacity, deadline, url,
endpoint }` with `capacity` a whole number from 1 to 100000 or `null`, `deadline` an ISO instant in UTC or `null`; the URLs
(`url`, `endpoint`, `calendarUrl`, `structuredData.registrationUrl`) are https (plain http only for `localhost` and
`127.0.0.1`, for a local admin); `structuredData` is `null` or `{ startDate, endDate, location, registrationUrl }` with the
dates as `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss-05:00`. Only the documented keys are copied. Absent keys read as `null`.

**What the landing does not do any more.** It has no form, loads no Turnstile and makes no `POST`: the form, its checks, its
answers and the Turnstile widget (with `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`) belong to the admin, and so do the rate
limit, the unique email and the capacity rule. `PUBLIC_TURNSTILE_SITE_KEY` is not read; `e2e/event-registration.spec.ts` checks
that no page of the build mentions Turnstile or carries a form.

**Structured data** (`src/lib/seo/events.ts`, `buildEvent` in `src/lib/seo/jsonld.ts`): every upcoming event with
`structuredData` adds a schema.org `Event` to the home (Spanish and English): name, description, `startDate` / `endDate`
(Ecuador time as the admin writes them), `location` as a `Place` named by the event's `lugar`, the first Cloudinary photo (else
the default share image), the organization as `organizer`, `eventStatus` scheduled and offline attendance. When people can sign up
(and the deadline has not passed) it adds a free `Offer` (`price: "0"`) whose URL is the admin's event page, for both modes. The
event's own `url` is `<home>#evento-<slug>`, the id of its card in Actividades, prefixed so a slug such as `faq` never takes a
section's id.

### News

Each item is `{ slug, title, summary, body, publishedAt, cover }` (contract S6 of the admin).
Validation is as strict as for the other fields, and one invalid item makes the whole payload
invalid, so the build falls back:

- `slug`: lowercase letters and digits joined by single hyphens, at most 100 characters, unique
  (it is the URL `/novedades/<slug>`)
- `title` 1-120, `summary` 1-280, `body` 1-10000 characters, none of them blank; at most 200 items
- `publishedAt`: a real calendar date, `YYYY-MM-DD`
- `cover`: `null`, or `{ url, width, height, alt }` with the same Cloudinary image URL rules as
  every other admin image, width/height integers from 1 to 10000 and `alt` 1-200 characters

Where it shows up:

- **Home**: a "Novedades" section after Actividades, a teaser (`src/components/News.astro`): the 3 most recent items as a
  plain list (date, title and arrow, each row linking to its post; `HOME_NEWS_COUNT` in `news.ts`; the landing sorts by
  `publishedAt`, newest first, ties keep the API order) and one button to `/novedades`, which has the rest. It is left out when there are no news, and so is the "Novedades" nav link.
- **`/novedades`**: every item. **`/novedades/<slug>`**: one static page per item, built by
  `getStaticPaths` from the resolved content, with its own `<title>`, meta description (the
  summary) and share image (the cover). The post ends with "Sigue leyendo" / "Keep reading": up to 3
  other posts of the same language, newest first (`relatedNews` in `src/lib/admin-content/news.ts`),
  left out when there are none.
- **Share** (`src/components/ShareBar.astro`): every post has "Compartir" / "Share" controls built from its
  canonical URL (`src/lib/share.ts`). Without JS they are links to WhatsApp, X and LinkedIn. With JS,
  `src/scripts/share.ts` shows the browser's share sheet (`navigator.share`) alone when there is one, and
  otherwise keeps the links and adds a "Copiar enlace" button that confirms in an `aria-live` region.
- **No news** (the fallback snapshot has `"news": []`, and so does an admin that has none
  published): there are no `/novedades/<slug>` pages, and `/novedades` still builds as a short
  empty state marked `noindex`, so a shared or bookmarked link never ends in a 404.
- **Covers** are delivered by Cloudinary like any other photo (see Photos above).
- **`body`** is a small Markdown subset rendered by `src/lib/admin-content/markdown.ts`:
  paragraphs (blank line), `**bold**`, `*italic*`, `[text](https://...)` and `- ` lists; a
  backslash keeps `\* [ ] ( ) - _` literal. Raw HTML is never rendered: every character is
  escaped and only `p`, `ul`, `li`, `strong`, `em` and `a` come out (each link also carries a
  visually hidden "se abre en otra pestaña" note). Only `https:` links are
  kept (`target="_blank"`, `rel="noopener noreferrer"`); `http:`, `javascript:`, relative or
  credentialed URLs, headings, images, quotes and ordered lists stay plain text.

To try it without an admin, serve a payload with `news` from any local HTTP server and build
against it: `ADMIN_CONTENT_URL=http://127.0.0.1:8799/api/public/content pnpm build`. Image URLs
in that payload must be Cloudinary ones.

## Tests

```sh
pnpm test      # vitest: fetch, validation, fallback, mapping, preview loader, content gate, dev refresh, Markdown, share links, related posts, motion plan, tickets, deadline rules and seats, SEO builders, i18n
pnpm test:coverage   # same suite with V8 coverage over `src/**/*.ts` (tests excluded); CI runs this one
pnpm build && pnpm test:e2e   # Playwright (Chromium) against `astro preview` of that build
```

Coverage thresholds (statements 59, branches 66, functions 62, lines 59) live in `vitest.config.ts` and were set to the measured values rounded down. They only count what the unit tests reach: the browser scripts in `src/scripts/` and the `.astro` components are exercised by the e2e suite, so they pull the number down. Never lower the thresholds; raise them when coverage grows.

`pnpm test:e2e` (CI job `e2e`) runs the suites in `e2e/`. Most use the fallback build, so they need no secrets:

- `a11y.spec.ts`: axe-core (`@axe-core/playwright`) over `/`, `/en/`, `/novedades/`, `/privacidad/`, `/en/privacidad/` (and the first news post
  when the fallback has one), in the dark and the light theme with motion reduced. Any **serious or critical**
  violation fails, and the failure prints the rule and the offending elements.
- `motion-loading.spec.ts`: which motion chunks a desktop, a touch screen and a reduced-motion visitor download; also that
  the ribbon and every looping animation stop off screen.
- `home-layout.spec.ts`, `activities-opener.spec.ts` and `home-terminals.spec.ts`: the story-first section order and that the
  nav links follow it, the type scale (one size for every section title, no split words, no sideways scroll at 320 px, 44 px
  targets), the polish rules (plain kicker and statement in Nosotros, no role chips, no Redes sticker, titles-only Ideas steps,
  upcoming cards without hora/lugar/para, no empty filter), the short hero (headline, shortcuts and ribbon, no pin), the opener
  of Actividades with its split trunk, the old activities folded behind a disclosure, and the news and forum teasers. The news
  cases skip on a fallback build (it has no news).
- `audit-landing.spec.ts`: the 2026-10-29 platform audit on the built site: four widths (320, 390, 768, 1440) on the four
  home and news pages, keyboard and focus, reduced motion, the 404, a clean console, links that leave the page, the FAQ accordion,
  the language switch and the forum links (only the admin's `/foro`). With `AUDIT_LIVE_URL` set it also visits a running dev
  server or deploy.

These build the site again against a mock admin (`e2e/support/admin-site.ts`, into `node_modules/.cache/aso-e2e/`, never
`dist/`), so they cover what the fallback build cannot show. They run serially because the builds share Astro's cache:

- `built-from-admin.spec.ts`: the Aliados section (rendering, alt text and links, both languages, hidden when the admin sends
  none or on the fallback build, axe in both themes, nothing animated under reduced motion; `#impacto` and `#testimonios`
  never exist) and the preview mode (token header, banner, noindex, a draft shows up, the token is in no file, a normal build
  ignores it, a 401 or a missing `preview: true` fails the build). It runs several builds, so it is one of the slowest suites.
- `event-registration.spec.ts`: a mock admin that also answers the seats endpoint (`page.route`; no spec
  reaches Cloudflare or a real admin). It covers what each event shows (the ticket for each mode, a free pass, closed at
  build time, expired in the browser via `page.clock`, past, English), that every ticket links to
  `<admin>/foro/eventos/<slug>` and no page carries a form, a Turnstile reference or a script for one, that the links of a
  ticket carry the activity in their name, the live seats (one plain GET without credentials, N of M and the meter, the
  singular, full, closed, no capacity, an answer that is not the contract, offline, slow, no change of height), the `.ics`
  links, the `Event` JSON-LD and its offers, an admin without the S8 keys, links on another origin (left out, build warning)
  and axe in both themes with live, full and closed seats. Events are dated relative to the day of the run.
- `moments.spec.ts`: the two small moments (networks in the hero, the decrypting Novedades title), which need an admin with
  tickets and news; each is still under reduced motion and none shifts the page.
- `audit-landing-content.spec.ts`: content a real admin could send: the longest values the validator accepts, text with no
  break point, images that never load, empty lists and failing seats.
- `audit-landing-dev.spec.ts`: `astro dev` started while the admin is down serves the fallback, then the admin's content on
  the next visit once it answers, without a restart.

When a dev server already holds port 4321, run the same suite on another port:
`E2E_PORT=4322 pnpm exec playwright test -c e2e/alt-port.config.ts` (`e2e/alt-port.config.ts`).

Lighthouse CI (`lighthouserc.json`, CI job `lighthouse`, `pnpm build && pnpm lighthouse`) audits the same three
pages three times each on the fallback build, mobile profile, and asserts the median run. Budgets:
performance ≥ 0.9, accessibility ≥ 0.95, best-practices ≥ 0.95, SEO ≥ 0.95. One budget is lower on purpose:
SEO of `/novedades/` is 0.65 because with no news that page is `noindex` (Lighthouse's `is-crawlable` fails,
measured 0.66); once the build has news the page is indexable, so raise it to 0.95. Reports stay in `.lighthouseci/`
(ignored by git); nothing is uploaded.

First time: `pnpm exec playwright install chromium`. To see what the home page downloads on first load:
`pnpm build && pnpm preview` and, in another terminal, `pnpm measure:js`.

## Editing content

Real content is edited in the admin. What stays in code (`src/data/site.ts`): the hero and
manifesto copy, the nav, the ribbon, the contribute section, the forum teaser, the three structural timeline
entries and the demo placeholders. Sections are rendered in `src/views/HomePage.astro`; the news pages
are `src/views/NewsIndexPage.astro` and `src/views/NewsPostPage.astro`.

## The home page

The home is story first: who we are comes right after the hero, then the agenda (sign up, activities, news), then the forum
and the board, and the questions and ways to take part last. The order is fixed in `src/views/HomePage.astro` and checked by
`e2e/home-layout.spec.ts`; a section marked \* is left out when it has nothing to show, and the header links follow the same
order (`navLinks` in `src/data/site.ts`). Section kickers are plain words ("Nosotros", "Próximas fechas", ...); the
terminal voice stays in three places: the hero's `ping`, the Actividades opener and its `git log --grep=` filters, and the
`git show` panels of the board.

| # | Section (id) | Source |
|---|--------------|--------|
| 1 | Hero (`top`): headline, lede, three ticket-shaped shortcuts and the network moment | `site.ts` (the shortcuts point at sections that render) |
| 2 | Ribbon: next activities, the forum and Instagram, built from the tickets | `site.ts`, admin events |
| 3 | Nosotros (`nosotros`): manifesto, a statement with a facts line, and the pillars | admin `settings.about` (fallback `site.about`), `site.ts` (`aboutStatement`), admin pillars |
| 4 | Inscripciones (`inscripciones`)\*: one ticket per upcoming activity, live seats | admin events |
| 5 | Actividades (`actividades`): opener, then the planned lane and the history; filters only for types that have entries | admin events + `site.ts` anchors |
| 6 | Novedades (`novedades`)\*: the three latest posts and a button to `/novedades` | admin news |
| 7 | Foro (`foro`): the forum teaser | `site.ts`, link to the admin |
| 8 | Directiva (`directiva`)\*: the board | admin board |
| 9 | FAQ (`faq`)\*: a plain accordion | admin FAQ |
| 10 | Ideas (`ideas`): the contribute section, the four steps by title | `site.ts` (demo until approved) |
| 11 | Redes (`redes`)\*: socials | admin socials |
| 12 | Aliados (`aliados`)\*: sponsors | admin sponsors |

**Type scale.** There are eight font sizes and nothing else: Tailwind's defaults are cleared (`--text-*: initial`) and
`src/styles/global.css` defines `display`, `section`, `title`, `lead`, `body`, `secondary`, `label` and `small` as the only
`text-*` utilities. Every section title uses `section`. Titles are Mona Sans expanded (`font-display`, 125% width); the
Audiowide face (`font-brand`) is kept for the wordmark only (header and 404). Body text is Mona Sans at normal width, and dates,
branch names and hashes use Geist Mono.

**Hero and the Actividades opener.** The hero is about one screen and has no scroll pin. The isotype animation that used to open
the page now opens Actividades: over a tall run (`html.motion .op`) a CSS-`position: sticky` stage (`.op-stage`) plays the
isotype growing, its brackets sliding off and its cursor thinning into a stem that lands on the trunk, which then splits into
the planned lane (dotted) and the history (solid; stacked on phones). There is no JS pin, so touch scrolling stays native and
the browser bars cannot make it jump. Without motion (reduced motion, or the script failing) it is its static end state.
The older entries of the history fold into a plain `<details>` that opens without JS.

**Two small moments** (`src/scripts/moments.ts`, imported by `ui.ts` only on a page that has one): a network graph behind the
hero shortcuts (screens of 1180 px and wider) and a decrypting Novedades title. Each is its calm end state under reduced motion.

## Themes and languages

**Theme.** Dark is the brand look; a light palette repaints the same colour roles (`navy`, `ink`, `sky`, ...)
in `src/styles/global.css` under `:root[data-theme="light"]`. The first visit follows
`prefers-color-scheme`; the header button stores the choice in `localStorage` (`aso-theme`). An inline script
in `Layout.astro` sets the theme before the first paint, so there is no flash. Use the role utilities
(`text-ink`, `bg-navy`, `text-on-sky`), not `text-white`, and `.theme-dark-only` / `.theme-light-only` for
pieces drawn once per theme.

**Privacy policy.** `/privacidad/` and `/en/privacidad/` (the public URL Google asks for the OAuth app of the admin and the forum), linked from the footer. The text is in `src/i18n/privacy.ts` and describes what the admin and the forum store; change it with them and bump `privacyUpdated`. Contact: `contactEmail`.

**Languages.** Spanish lives at `/`, English under `/en/` (`/en/`, `/en/novedades/`,
`/en/novedades/<slug>/`, `/en/privacidad/`). The header switch goes to the same page in the other language, and every page
carries `hreflang` alternates and the right `<html lang>`. Only the landing's *fixed* copy is translated;
what is loaded in the admin (events, FAQ, pillars, news, board, site texts) and the demo placeholders stay in
Spanish. Dates are formatted per language.

Where the strings live:

| What | Where |
|------|-------|
| Short UI words (buttons, labels, aria texts, countdown, filters) | `src/i18n/ui.ts` (`es` and `en`; the type forces `en` to have every key) |
| Section copy (hero, manifesto, Nosotros statement, ribbon, nav, contribute, FAQ intro) | `copy` in `src/data/site.ts` |
| Routes, `localizedPath`, `alternatePath` | `src/i18n/locales.ts` |
| Content in a language | `getContent(locale)` in `src/data/content.ts` |

To add a UI word: add the key to `es` and to `en` in `src/i18n/ui.ts`, then `t('your.key')` in the component
(`const t = useTranslations(toLocale(Astro.currentLocale))`). Client scripts read the language from
`<html lang>`. To add a language: extend `locales` in `src/i18n/locales.ts` and `astro.config.mjs`, add its
dictionary and `copy` entry, and a route folder next to `src/pages/en/` (thin files that render the views).

## SEO and sharing

Every page gets, from `src/lib/seo/meta.ts` (printed by `Layout.astro`): a `<link rel="canonical">`, Open Graph
(`og:url`, `og:site_name`, `og:locale` + alternate, `og:image`) and Twitter Card (`summary_large_image`) tags.
All URLs are built from `site` in `astro.config.mjs`, the only place that names the host: moving to a custom
domain is a one-line change there. A page without its own share image (news posts use their cover) gets the
default one, `public/og-default.png` (1200×630).

Structured data (JSON-LD, `src/lib/seo/jsonld.ts`): every page carries the `Organization` (name, URL, logo,
`sameAs` from the socials in the admin, contact email), each news post adds a `NewsArticle` (headline, summary,
date, cover, language, the organization as publisher) and the home adds an `Event` per upcoming activity that has
schedule values (see "Event registration"). Content can never close the `<script>` tag: `<` is
escaped by `serializeJsonLd`. The contact email is `contactEmail` in `src/data/site.ts`, used by the footer and
the structured data: change it there only.

Crawlers, readers and hosting:

| What | Where |
|------|-------|
| `/sitemap-index.xml`, `/sitemap-0.xml` (every page with its `es-EC` / `en-US` alternates) | `@astrojs/sitemap` in `astro.config.mjs` |
| `/robots.txt` (allows everything, points at the sitemap) | `src/pages/robots.txt.ts`, from `site` |
| `/novedades/rss.xml` and `/en/novedades/rss.xml`, announced with `<link rel="alternate" type="application/rss+xml">` | `src/pages/**/rss.xml.ts` via `src/views/newsFeed.ts` (`@astrojs/rss`) |
| `/404.html` (Spanish first, English below, `noindex`; Cloudflare Pages serves it for every unknown URL) | `src/pages/404.astro` |
| Response headers: immutable cache for `/_astro/*`; `nosniff`, `Referrer-Policy`, `Permissions-Policy`, and a CSP limited to `frame-ancestors 'none'; base-uri 'self'; object-src 'none'` | `public/_headers` |
| `/site.webmanifest`, `apple-touch-icon.png`, `favicon-32.png`, `icon-192.png`, `icon-512.png` | `public/`, linked from `Layout.astro`; the PNGs come from `pnpm assets:brand` |

The CSP has no `script-src`/`style-src` on purpose: the layout has inline scripts (theme, motion) and a stricter policy
would break the site until they are moved out. The manifest's `theme_color` matches the `theme-color` meta in the layout.

With no news, `/novedades` is `noindex` but the sitemap still lists it (the integration cannot see page content);
the feed is valid and empty. `pnpm build && pnpm verify:dist` checks that these files exist and carry their key
lines.

The raster brand files under `public/` are generated from the vectors in `src/assets/brand/`:

```sh
pnpm assets:brand   # scripts/generate-brand-assets.mjs (sharp); commit the PNGs it writes
```

## Motion

The scroll choreography (`src/scripts/motion.ts`) uses GSAP + ScrollTrigger, and Lenis for smooth scrolling. What a
visitor downloads is decided by `planMotion` in `src/scripts/motion-policy.ts` (pure, unit-tested):

| Visitor | GSAP + ScrollTrigger | Lenis |
|---------|----------------------|-------|
| `prefers-reduced-motion: reduce` | not loaded; the page is static | not loaded |
| Touch screen (no `(pointer: fine) and (hover: hover)`) | loaded | not loaded; native scrolling |
| Mouse | loaded | loaded |

The libraries are separate chunks fetched with a dynamic `import()` after the first paint, once the browser is
idle (a second at most, `requestIdleCallback` with `timeout: 1000` in `motion.ts`), so they never compete with the HTML, CSS
and fonts. Everything is visible without them; the pre-motion state lives behind `html.motion`, which the layout adds only
when motion is allowed and removes if the script fails or never starts. Looping CSS animations (blinking cursors, live dots)
are paused while their block is off screen (`src/scripts/idle-motion.ts`). The Actividades opener is described under
[The home page](#the-home-page).

## Quality gates

What runs on every pull request and on `main` (`.github/workflows/ci.yml`; no secrets, the build has no `ADMIN_CONTENT_URL` and
uses the fallback):

| Job | Runs | Fails when |
|-----|------|------------|
| `checks` | `pnpm audit --prod --audit-level high`, `pnpm lint` (ESLint with `typescript-eslint` and `eslint-plugin-astro`), `pnpm check` (`astro check`), `pnpm format:check` (Prettier with the Astro plugin; `*.md` is in `.prettierignore`), `pnpm test:coverage` (vitest with V8 coverage thresholds), `pnpm build` | any step fails, coverage drops under a threshold in `vitest.config.ts`, or a production dependency has a high or critical advisory |
| `e2e` | `pnpm build`, then `pnpm test:e2e` (see Tests) | a spec fails, including serious or critical axe violations |
| `lighthouse` | `pnpm build`, then `pnpm lighthouse` | a median category score is under budget (see below) |

Also: Dependabot opens weekly pull requests for npm and GitHub Actions, minor and patch updates grouped and majors apart
(`.github/dependabot.yml`), and minor and patch updates are approved and auto-merged once the required checks pass
(`.github/workflows/dependabot-auto-merge.yml`); `.github/CODEOWNERS` requests the maintainer's review; SonarCloud analyses the project and leaves the
two parallel copy tables out of duplicate detection (`.sonarcloud.properties`: `src/i18n/ui.ts`, `src/data/site.ts`).

## Structure

```text
src/
├── data/
│   ├── content.ts        # resolves the content once per build (API or fallback), runs the production gate
│   ├── fallback.json     # committed snapshot of the real content, API shape (news: [])
│   └── site.ts           # landing-owned copy and demo placeholders
├── lib/admin-content/    # validate, load (fetch + fallback), gate, refresh (dev), preview (build mode), map, timeline, forum
│                         # (admin URLs), news, markdown, cloudinary, compose (+ tests)
├── lib/registration/     # event registration: tickets, deadline rules, live seats (+ tests)
├── lib/seo/              # canonical URL, social meta, JSON-LD (Organization, NewsArticle, Event), robots.txt, RSS items (+ tests)
├── lib/share.ts          # share links and which controls to show (+ test); lib/analytics.ts: Cloudflare beacon
├── i18n/                 # locales, localized paths, nav routing, UI dictionary (es/en)
├── components/           # one Astro component per section (Hero, Registrations, News, ActivityGraph, Forum, ...), Photo, Ticket, ShareBar
├── scripts/              # client scripts: motion (+ policy), ui, theme, seats, ticket-deadline, share, moments (network, decrypt)
├── layouts/Layout.astro  # HTML shell, theme script, hreflang, canonical, social meta and JSON-LD
├── middleware.ts         # dev only: asks the admin again when the server started with the fallback
├── views/                # the pages' bodies, shared by both languages (HomePage, NewsIndexPage, NewsPostPage, newsFeed)
├── pages/                # thin routes: / and /novedades (es), /en/... (en); 404, robots.txt, RSS
└── styles/global.css     # Tailwind entry point, theme tokens, type scale, every component style
e2e/                      # Playwright suites (see Tests); e2e/support/admin-site.ts builds the site against a mock admin
scripts/                  # generate-brand-assets, verify-dist, measure-js
```

## Cómo colaborar

Este es un proyecto de la comunidad de ASO Computación y la directiva lo mantiene junto con quien quiera aportar.

- **Contenido** (eventos, fotos, FAQ, directiva, pilares, redes): se edita en el panel de administración, sin tocar código.
- **Código y diseño**: Pull Request contra `main`. `main` está protegida, así que todo cambio entra por PR con una aprobación y la CI tiene que pasar en verde (ver [Quality gates](#quality-gates)). Conviene correr lo mismo localmente antes de pedir revisión.
- **Errores e ideas**: abra un issue con las plantillas del repositorio.

La guía completa, con el flujo de ramas, las convenciones de commits y las buenas prácticas para la directiva, está en [CONTRIBUTING.md](../CONTRIBUTING.md). Las vulnerabilidades se reportan en privado según [SECURITY.md](../SECURITY.md).

## License

[MIT](../LICENSE)
