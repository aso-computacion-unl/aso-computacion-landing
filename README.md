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

## Cómo colaborar

Este es un proyecto de la comunidad de ASO Computación y la directiva lo mantiene junto con quien quiera aportar.

- **Contenido** (eventos, fotos, FAQ, directiva, pilares, redes): se edita en el panel de administración, sin tocar código.
- **Código y diseño**: Pull Request contra `main`. `main` está protegida, así que todo cambio entra por PR con una aprobación y no hay CI: se corre `pnpm test` y `pnpm build` localmente antes de pedir revisión.
- **Errores e ideas**: abrí un issue con las plantillas del repositorio.

La guía completa, con el flujo de ramas, las convenciones de commits y las buenas prácticas para la directiva, está en [CONTRIBUTING.md](CONTRIBUTING.md). Las vulnerabilidades se reportan en privado según [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
