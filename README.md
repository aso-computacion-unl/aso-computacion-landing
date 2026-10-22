# ASO Computación — Landing Page

Landing page for the student association of the Computer Science program.

Built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com).

## Getting started

```sh
pnpm install
pnpm dev       # http://localhost:4321
pnpm build     # output in ./dist
pnpm preview
```

## Editing content

All page content (name, activities, team, contact, social links) lives in
`src/data/site.ts`. Sections are rendered in `src/pages/index.astro`.

## Structure

```text
src/
├── data/site.ts          # page content
├── layouts/Layout.astro  # HTML shell and global styles
├── pages/index.astro     # landing sections
└── styles/global.css     # Tailwind entry point
```
