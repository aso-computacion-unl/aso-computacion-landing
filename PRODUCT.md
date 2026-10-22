# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro (static output) + Tailwind CSS v4 + GSAP with ScrollTrigger + Lenis smooth scroll. Chosen by the user. Static hosting (GitHub Pages candidate, not yet confirmed).

## Users

Students of the Computer Science (Computación) program: current students, incoming students, and anyone evaluating the association.

## Product Purpose

Public landing page for ASO Computación, the student association of the Computer Science program. It serves all goals equally: inviting students to join, announcing activities and events, and presenting the association and its board.

## Capabilities and Constraints

- Single landing page; content is edited in `src/data/site.ts`.
- Page copy is in Spanish (audience language); code, comments, and docs are in English.
- University: Universidad Nacional de Loja (UNL), Loja, Ecuador.
- Socials (from the board): Instagram @aso_computacion, TikTok @aso_computacion_unl, Twitch ASO_Computacion, LinkedIn company page `aso-computacion-unl`. No Facebook and no contact email: contact happens through social DMs.
- Open: deploy target and domain.

## Brand Commitments

- Name: "ASO Computación".
- Official logo in `src/assets/brand/` (cropped to content; originals were 720x720 UTF-16 Illustrator exports): `logo-color` (light backgrounds), `logo-white` and `logo-white-sky` (navy backgrounds), `isotype-color`, `isotype-white`. `public/favicon.svg` is `isotype-color`. Original logo navy is `#062e5f`, a hair off the palette's `#053066`; do not recolor brand assets.
- Official palette (tokens in `src/styles/global.css`):
  - Navy `#053066` (`navy`): primary. Backgrounds, titles, institutional elements, text.
  - Tech Sky `#2bb2e4` (`sky`): primary complement. Details, tech elements, icons, accents.
  - Light Gray `#d9d9d9` (`mist`): neutral. Secondary backgrounds, dividers, visual rest.
  - Red `#b7353e` (`signal`): accent. Alerts, key dates, one-off calls to attention. Fails contrast as text on navy; use on light surfaces or as a fill.
- Typography: the brand display face (named "Audiowave" in the brand brief; implemented as Audiowide, pending confirmation) for titles, covers, headers, and promotional pieces only (`font-display`). Body and UI text use Mona Sans, GitHub's variable typeface (`font-sans`; width axis: leads 112%, buttons and FAQ questions 118%), and short labels/metadata use Geist Mono (`font-mono`). The brand guide recommends Inter or Montserrat; the user chose Mona Sans over both after comparing specimens.
- Board photos live in `src/assets/team/` with metadata stripped. Board order and roles come from the board's roster. Publish only display name and role; the roster's phones, ages, emails, and personal Instagram handles stay out of the repository.

## Evidence on Hand

The user has a real logo, real event/team photos, and real board names, roles, and social links. Not yet in the repository. Until delivered, the page uses clearly marked placeholders; never fabricate members, events, dates, or statistics.

## Product Principles

1. Students first: every section answers what a student gains.
2. Real over invented: show real people, photos, and activities only.
3. Easy to maintain: future boards must update content without touching layout code.
4. Fast everywhere: impressive motion must not break low-end phones or reduced-motion preferences.
