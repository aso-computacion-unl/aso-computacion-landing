# ASO Computación — Landing Page

Landing page for the student association of the Computer Science program.

Built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com).

## Getting started

```sh
pnpm install
pnpm dev       # http://localhost:4321
pnpm build     # output in ./dist
pnpm test
pnpm preview
```

## Content from the admin

Events, FAQ, pillars, socials, the board and the site copy are managed in the admin
(`aso-computacion-admin`). The landing is static: it reads that content **at build time** and
bakes it into the HTML, so a change in the admin shows up after the next build (the admin
triggers one through a deploy hook, plus a daily rebuild as a safety net).

> **Schedule the daily rebuild after 05:00 UTC.** "Today" (which decides what is an upcoming
> event) is fixed at build time, in Ecuador time (UTC-5). A rebuild before 05:00 UTC still sees
> the previous day in Ecuador, so an event would stay "upcoming" a day too long.

| Variable | Where | What |
| --- | --- | --- |
| `ADMIN_CONTENT_URL` | build environment | Full URL of the admin's `GET /api/public/content`, for example `https://your-admin.vercel.app/api/public/content`. See `.env.example`. |

```sh
ADMIN_CONTENT_URL=https://your-admin.vercel.app/api/public/content pnpm build
```

On Cloudflare Pages, set it under Settings → Environment variables. It is read once when the
build (or `pnpm dev`) starts, so restart the dev server to fetch again.

### The build never fails because of the admin

The fetch has a 10 second timeout and the payload is validated against the version 1 shape
(`src/lib/admin-content/validate.ts`). On **any** of these, the build logs one warning
(`[admin-content] Using src/data/fallback.json: <reason>`) and uses the committed
`src/data/fallback.json` instead:

- `ADMIN_CONTENT_URL` is unset, blank or not a URL
- network error or timeout
- a status other than 200
- invalid JSON, a payload that does not match the shape, or a `version` other than `1`
- an image URL that is not `https://res.cloudinary.com/<cloud>/image/upload/...` (another host,
  `/video/upload/`, `http`...)
- a `linkUrl` or social `url` that is not `https`
- a string or an array over its cap (text up to 2000 characters, titles 240, at most 100
  events, 12 photos per event and 50 FAQs, pillars, socials or board members)

Images are never downloaded at build time, so no image can fail the build (see Photos below).

Only keys in the documented shape are kept; anything else in the response is dropped. In
particular a board member is rebuilt from `name`, `role` and `photo` and nothing more.

### The fallback snapshot

`src/data/fallback.json` has the same shape as the API and holds the real (non-demo) content:
events, socials and the board. It points at images bundled in `src/assets/` (`/src/assets/...`),
never at remote URLs, so the fallback path needs no network. `settings: null` means "keep the
copy in `src/data/site.ts`". Update the snapshot by hand when real content changes and the
admin is expected to be down; `pnpm test` checks that it is valid and that its images exist.

Placeholder (demo) content lives in `src/data/site.ts` and is shown **only on the fallback
path**: demo events are merged into the timeline by date, and demo FAQ items and pillars fill
in while the snapshot has none. When the admin answers, its content is the whole truth: a
section with nothing to show is left out.

### How the admin content maps to the page

- **Events** become timeline entries. The kind comes from the date (Ecuador time) at build
  time: on or after today is `upcoming`, earlier is a `commit`, a past event with
  `highlights` is a `merge` (the highlights are its feature branch), and an event without a
  date is a `commit` listed last. The `next`, `HEAD` and `initial` entries stay in
  `src/data/site.ts`.
- **FAQ** `topic` (`git help <topic>`) is the question as a slug, cut at 28 characters.
- **Socials** `platform` picks a Simple Icons glyph; an unknown platform gets a generic one.
- **Pillars** without an image show the isotype tile.
- **Settings** `tagline`, `description` and `about` replace the landing copy when present.
- **Photos**: admin images are plain `<img>` tags served by Cloudinary. The build inserts a
  delivery transformation after `/image/upload/` (`f_auto,q_auto,c_limit,w_<n>`, see
  `src/lib/admin-content/cloudinary.ts`) and writes a `srcset` with two or three widths, the
  `width`/`height` the admin reports, `loading="lazy"` and `decoding="async"`. Cloudinary
  resizes and re-encodes on first request, so the build downloads nothing. Bundled images (the
  fallback snapshot and the demo placeholders) still go through Astro's image pipeline. Both
  paths render through `src/components/Photo.astro`. Board photos appear only in the Directiva
  section.

## Tests

```sh
pnpm test      # vitest: fetch, validation, fallback and mapping
```

## Editing content

Real content is edited in the admin. What stays in code (`src/data/site.ts`): the hero and
manifesto copy, the nav, the ribbon, the contribute section, the three structural timeline
entries and the demo placeholders. Sections are rendered in `src/pages/index.astro`.

## Structure

```text
src/
├── data/
│   ├── content.ts        # resolves the content once per build (API or fallback)
│   ├── fallback.json     # committed snapshot of the real content, API shape
│   └── site.ts           # landing-owned copy and demo placeholders
├── lib/admin-content/    # validate, load (fetch + fallback), map, compose (+ tests)
├── layouts/Layout.astro  # HTML shell and global styles
├── pages/index.astro     # landing sections
└── styles/global.css     # Tailwind entry point
```
