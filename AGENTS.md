## Project

Public landing of ASO Computación (static Astro site on Cloudflare Pages). It is half of a system: the content is edited in the admin (`aso-computacion-admin`) and read at build time; registration and the forum live on the admin's origin. System overview: https://github.com/aso-computacion-unl/aso-computacion-admin/blob/main/docs/ARQUITECTURA.md. Product brief: `PRODUCT.md`. Landing reference: `docs/REFERENCIA.md`; deploy: `docs/DEPLOY.md`.

- pnpm only (`pnpm install --frozen-lockfile`); Node `>=22.23.4`. Never add `package-lock.json` or `yarn.lock`.
- Checks CI runs, to run before you finish: `pnpm lint`, `pnpm check`, `pnpm format:check` (Prettier: tabs, single quotes, 120 columns; `.md` files are ignored), `pnpm test`, `pnpm build`, and for UI work `pnpm test:e2e` (needs a build and `pnpm exec playwright install chromium`). A running dev server holds port 4321: use `e2e/alt-port.config.ts` for the e2e suite.
- Content comes from `ADMIN_CONTENT_URL` at build time; without it the build uses `src/data/fallback.json` and marks demo content. A production build (`CF_PAGES_BRANCH` equals `PRODUCTION_BRANCH`) fails instead of shipping the fallback. Do not read `.env` files or print secrets (`PREVIEW_TOKEN`, deploy hook URLs).
- Fixed copy is in `src/data/site.ts` and the UI dictionary in `src/i18n/ui.ts` (every key in `es` and `en`); admin content is validated in `src/lib/admin-content/validate.ts`. Links to the admin must stay on the admin's origin (`src/lib/admin-content/forum.ts`). The landing has no form and loads no Turnstile.
- Use the type-scale utilities (`text-body`, `text-section`, ...) and the theme roles (`text-ink`, `bg-navy`), not raw sizes or `text-white`. Respect reduced motion; motion code is loaded lazily (`src/scripts/motion-policy.ts`).
- Commits are Conventional Commits in English (`feat:`, `fix:`, `docs:`, ...). Code, comments and docs are in English; the project guides (README, CONTRIBUTING, SECURITY) are in Spanish.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
