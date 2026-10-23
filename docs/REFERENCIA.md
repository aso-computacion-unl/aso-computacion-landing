> Referencia técnica de la landing: cómo se arma el contenido, el fallback y el mapeo. Para empezar, leé el [README](../README.md).

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

```sh
ADMIN_CONTENT_URL=https://your-admin.vercel.app/api/public/content pnpm build
```

On Cloudflare Pages, set it under Settings → Environment variables. It is read once when the
build (or `pnpm dev`) starts, so restart the dev server to fetch again.

See [DEPLOY.md](DEPLOY.md) for the Cloudflare Pages setup, the deploy hook, the daily
rebuild workflow and a first-deploy checklist.

### The build never fails because of the admin

The fetch has a 10 second timeout and the payload is validated against the version 1 shape
(`src/lib/admin-content/validate.ts`). On **any** of these, the build logs one warning
(`[admin-content] Using src/data/fallback.json: <reason>`) and uses the committed
`src/data/fallback.json` instead:

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
- **Month-only dates**: an event may carry `datePrecision: "month"` (optional, default
  `"day"`; any other value makes the payload invalid). Its chip reads "feb 2026", never a day.
  For ordering and for upcoming/past it counts as the first of that month, and it never feeds
  the countdown panel. The `date` still has to be a full `YYYY-MM-DD`; its day is ignored.
- **News** (`news`, newest `publishedAt` first) become the Novedades section of the home, the
  `/novedades` list and one page per item. See "News" below.
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

- **Home**: a "Novedades" section after the activity graph with the 3 most recent items (the
  landing sorts by `publishedAt`, newest first, ties keep the API order) and a link to
  `/novedades`. It is left out when there are no news, and so is the "Novedades" nav link.
- **`/novedades`**: every item. **`/novedades/<slug>`**: one static page per item, built by
  `getStaticPaths` from the resolved content, with its own `<title>`, meta description (the
  summary) and share image (the cover).
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
pnpm test      # vitest: fetch, validation, fallback, mapping and the Markdown renderer
```

## Editing content

Real content is edited in the admin. What stays in code (`src/data/site.ts`): the hero and
manifesto copy, the nav, the ribbon, the contribute section, the three structural timeline
entries and the demo placeholders. Sections are rendered in `src/pages/index.astro`; the news pages
are in `src/pages/novedades/`.

## Structure

```text
src/
├── data/
│   ├── content.ts        # resolves the content once per build (API or fallback)
│   ├── fallback.json     # committed snapshot of the real content, API shape (news: [])
│   └── site.ts           # landing-owned copy and demo placeholders
├── lib/admin-content/    # validate, load (fetch + fallback), map, news, markdown, compose (+ tests)
├── layouts/Layout.astro  # HTML shell and global styles
├── pages/index.astro     # landing sections
├── pages/novedades/      # news list and one page per item
└── styles/global.css     # Tailwind entry point
```

## Cómo colaborar

Este es un proyecto de la comunidad de ASO Computación y la directiva lo mantiene junto con quien quiera aportar.

- **Contenido** (eventos, fotos, FAQ, directiva, pilares, redes): se edita en el panel de administración, sin tocar código.
- **Código y diseño**: Pull Request contra `main`. `main` está protegida, así que todo cambio entra por PR con una aprobación y la CI tiene que pasar en verde (`pnpm test` y `pnpm build`). Conviene correr lo mismo localmente antes de pedir revisión.
- **Errores e ideas**: abrí un issue con las plantillas del repositorio.

La guía completa, con el flujo de ramas, las convenciones de commits y las buenas prácticas para la directiva, está en [CONTRIBUTING.md](../CONTRIBUTING.md). Las vulnerabilidades se reportan en privado según [SECURITY.md](../SECURITY.md).

## License

[MIT](../LICENSE)
