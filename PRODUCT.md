# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro (static output) + Tailwind CSS v4 + TypeScript. Motion is GSAP with ScrollTrigger plus Lenis smooth scroll, loaded as separate chunks after first paint and only where the device allows (none under reduced motion, no Lenis on touch). Hosted on Cloudflare Pages (`aso-computacion-landing.pages.dev`; a custom domain is not set). Tested with Vitest, Playwright with axe-core, and Lighthouse CI. pnpm only.

The landing is one half of a system: the content (events, registrations, news, FAQ, board, socials, sponsors) is edited in the admin (`aso-computacion-admin`) and read at build time through its public API. See the system architecture in the admin repository, `docs/ARQUITECTURA.md`.

## Users

Students of the Computer Science (Computación) program: current students, incoming students, and anyone evaluating the association. Behind them, the board (directiva), who publishes everything from the admin and touches no code.

## Product Purpose

Public site of ASO Computación, the student association of the Computer Science program. It is task first: a student comes to sign up for an activity, read the news, see what is on and what already happened, or ask in the forum, and only then to learn who we are. It also presents the association and its board and invites ideas and feedback.

## Capabilities and Constraints

- One home page plus a news section (`/novedades`, one page per post, RSS) and a 404; Spanish at `/`, English under `/en/`. Section order: Inscripciones, Novedades, Actividades, Foro, Nosotros, Directiva, Ideas, FAQ, Redes, Aliados (sections without content are left out).
- Content comes from the admin at build time. A production build that would fall back to the committed snapshot or to demo content fails on purpose and the previous deployment stays live; local, CI and preview builds use the snapshot and mark demo content with a "demo" tag.
- The landing stores nothing and sets no cookie. Signing up for an event (UNL account or open form) and the forum happen on the admin's origin; the landing shows tickets (live seats read from the admin), links there, and carries no form. Links to the admin are only ever to the admin's own origin.
- Fixed copy (hero, manifesto, nav, contribute section, forum teaser, structural timeline entries) lives in `src/data/site.ts`. Only that fixed copy is translated; admin content stays in Spanish.
- Page copy is in Spanish (audience language) with an English version; code, comments, and docs are in English, except the Spanish-language project guides (README, CONTRIBUTING, SECURITY).
- University: Universidad Nacional de Loja (UNL), Loja, Ecuador. Dates are in Ecuador time (UTC-5).
- Socials: Instagram @aso_computacion, TikTok @aso_computacion_unl, Twitch ASO_Computacion, LinkedIn company page `aso-computacion-unl` (from the admin; the snapshot carries the same four). No Facebook. Contact is by social DMs and the association's email, `contactEmail` in `src/data/site.ts` (footer and structured data).
- Dark is the brand look and light is a repaint of the same colour roles; the first visit follows `prefers-color-scheme`.
- Open: custom domain.

## Brand Commitments

- Name: "ASO Computación".
- Official logo in `src/assets/brand/` (cropped to content; originals were 720x720 UTF-16 Illustrator exports): `logo-color` (light backgrounds), `logo-white` and `logo-white-sky` (navy backgrounds), `isotype-color`, `isotype-white`. `public/favicon.svg` is `isotype-color`; the PNG icons and the share image come from `pnpm assets:brand`. Original logo navy is `#062e5f`, a hair off the palette's `#053066`; do not recolor brand assets.
- Official palette (tokens in `src/styles/global.css`):
  - Navy `#053066` (`navy`): primary. Backgrounds, titles, institutional elements, text. Its darker and lighter steps (`navy-deep`, `navy-lift`) are flat overlapping layers.
  - Tech Sky `#2bb2e4` (`sky`): primary complement. Details, tech elements, icons, accents, the branch line.
  - Light Gray `#d9d9d9` (`mist`): neutral. Secondary backgrounds, dividers, visual rest.
  - Red `#b7353e` (`signal`): accent. Alerts, key dates, one-off calls to attention. Fails contrast as text on navy; use on light surfaces or as a fill.
  - White paper (`paper`) with navy ink is the ticket and shortcut surface in both themes; actions are white on navy.
- Typography: one type scale of eight sizes (`display`, `section`, `title`, `lead`, `body`, `secondary`, `label`, `small`) and nothing else; every section title uses the same one. Titles use Mona Sans, GitHub's variable typeface, expanded (`font-display`, width 125%); body and UI text use Mona Sans at normal width (`font-sans`; leads 112%, buttons and FAQ questions 118%); dates, branch names and hashes use Geist Mono (`font-mono`). The brand display face, "Audiowave" in the brand brief and implemented as Audiowide (pending confirmation), is kept for the wordmark only (`font-brand`: header and 404). The brand guide recommends Inter or Montserrat; the user chose Mona Sans over both after comparing specimens.
- Visual language: the association's life as a repository history. Activities are commits on a branch, sections wear terminal and `git` vocabulary, tickets are paper stubs. Flat layers, no glow or soft shadow. Avoid an institutional/university look, a gamer/neon/glitch look, and a generic startup template.
- Board photos live in `src/assets/team/` with metadata stripped. Board order and roles come from the board's roster. Publish only display name and role; the roster's phones, ages, emails, and personal Instagram handles stay out of the repository.

## Evidence on Hand

The repository holds the real logo, the seven board members (name, role, photo), the four social links and a snapshot of the real events. Real event photos, news and sponsors arrive through the admin. What is still placeholder is marked `demo` and shown with a tag: the join section copy (pending the board's approval), the forum teaser's example threads, and the stock photos in `src/assets/demo/` (Unsplash, see `SOURCES.md`). Never fabricate members, events, dates, or statistics, and never ship demo content to production.

## Product Principles

1. Students first: every section answers what a student gains, and the first screens serve what they came to do.
2. Real over invented: show real people, photos, and activities only; whatever is an example says so.
3. Easy to maintain: future boards must update content from the admin without touching layout code.
4. Fast everywhere: impressive motion must not break low-end phones or reduced-motion preferences; the page works without JavaScript.
5. Accessible: serious and critical axe violations fail CI, in both themes and both languages; targets are at least 44 px and nothing scrolls sideways at 320 px.
6. Nothing personal here: the landing collects, stores and sets nothing; people's data lives in the admin.
