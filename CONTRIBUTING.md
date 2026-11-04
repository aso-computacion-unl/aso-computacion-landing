# Cómo colaborar

Gracias por ayudar con el sitio de ASO Computación. Esta guía es para la directiva y para cualquier estudiante que quiera aportar.

## ¿Querés cambiar contenido o código?

| Quiero… | Dónde se hace | ¿Necesito Git? |
|---|---|---|
| Publicar un evento y abrir sus inscripciones, subir fotos, publicar una noticia, editar la FAQ (y sus comandos), la directiva, los pilares, los aliados o las redes | En el **panel de administración** (repo `aso-computacion-admin`). El sitio se reconstruye solo unos segundos después de guardar. | No |
| Cambiar textos fijos (hero, manifiesto, menú, foro, sección de ideas), el diseño o el código | En **este repositorio**, con un Pull Request | Sí |
| Reportar un error o proponer una idea | Abriendo un **issue** en este repositorio | No |

Las inscripciones y el foro se atienden en el panel, no en este sitio: acá solo se muestran los boletos y se enlaza. Para entender cómo encajan las dos piezas, mirá la [arquitectura del sistema](https://github.com/aso-computacion-unl/aso-computacion-admin/blob/main/docs/ARQUITECTURA.md) y la [referencia técnica del sitio](docs/REFERENCIA.md).

Si no sabés por dónde empezar, abrí un issue y lo vemos juntos.

## Reglas de la rama `main`

`main` es lo que está publicado. Está protegida:

- Nadie empuja directo a `main`: todo cambio entra por un Pull Request.
- Cada PR necesita **1 aprobación** de otra persona.
- No se permite `force push` ni borrar `main`.
- La CI (GitHub Actions) tiene que pasar en verde para mergear. En cada PR corre tres trabajos y no usa secretos:
  - `checks`: auditoría de dependencias de producción (`pnpm audit`, falla con avisos altos o críticos), `pnpm lint`, `pnpm check`, `pnpm format:check`, `pnpm test` y `pnpm build`.
  - `e2e`: Playwright y axe-core sobre ese build (accesibilidad, orden de las secciones, escala tipográfica, movimiento).
  - `lighthouse`: presupuestos de rendimiento, accesibilidad, buenas prácticas y SEO.
- SonarCloud analiza el código de los PRs; sus hallazgos también hay que resolverlos.
- Se pide la revisión de quien mantiene el proyecto automáticamente (`.github/CODEOWNERS`).
- Dependabot abre PRs semanales: las actualizaciones menores y de parche llegan agrupadas; las mayores, por separado.

## Flujo de trabajo

1. **Issue primero.** Para algo más grande que un error de tipeo, abrí o elegí un issue y comentá que lo tomás.
2. **Rama nueva desde `main` actualizado:**
   ```sh
   git switch main && git pull
   git switch -c tipo/descripcion-corta   # ej.: fix/menu-movil, feat/seccion-galeria
   ```
3. **Commits pequeños** con [Conventional Commits](https://www.conventionalcommits.org/es/): `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`. El mensaje describe el cambio en inglés, en imperativo: `fix: align social tiles on mobile`.
4. **Comprobá localmente** (requiere Node 22 y pnpm); la CI corre lo mismo en el PR:
   ```sh
   pnpm install
   pnpm lint
   pnpm check          # astro check: tipos de .astro y .ts
   pnpm format:check   # pnpm format lo arregla
   pnpm test
   pnpm build
   pnpm test:e2e       # sobre el build de recién; la primera vez: pnpm exec playwright install chromium
   ```
   Prettier no formatea los `.md`, pero sí el resto del repositorio. Si tocaste algo visual, revisalo con `pnpm dev` en celular (390 px) y escritorio, también con movimiento reducido y en el tema claro. Los detalles de las pruebas y de Lighthouse están en [docs/REFERENCIA.md](docs/REFERENCIA.md#tests).
5. **Abrí el PR** contra `main`, completá la plantilla y enlazá el issue (`Closes #12`).
6. **Revisión.** Respondé los comentarios con commits nuevos en la misma rama; no reescribas la historia de una rama que ya está en revisión.
7. **Merge.** Quien aprueba (o quien abrió el PR, una vez aprobado) hace el merge y borra la rama.

### Tamaño de los PRs

Un PR debería poder revisarse en menos de una hora: idealmente **menos de 400 líneas cambiadas**. Si es más grande, dividilo en varios PRs que se puedan revisar por separado.

## Buenas prácticas para la directiva

- **Secretos fuera de Git.** Nunca subas archivos `.env`, contraseñas, tokens ni URLs de deploy hooks. Las credenciales se comparten por un gestor de contraseñas, no por WhatsApp ni en un issue.
- **Fotos con permiso.** Solo publicá fotos de eventos en las que las personas aceptaron aparecer. De la directiva se publica nombre, cargo y foto; nada de teléfonos, correos ni cédulas.
- **Imágenes con licencia.** Las imágenes de `src/assets/demo/` son de Unsplash y solo están de ejemplo (ver `SOURCES.md`). Reemplazalas por fotos reales de ASO; no agregues imágenes de internet sin licencia.
- **Revisiones amables.** Comentá el código, no a la persona. Si algo no queda claro, preguntá.
- **Cambio de directiva.** Cuando cambia la directiva:
  1. Sumar a las personas nuevas a la organización de GitHub y quitar a quienes salen.
  2. Rotar la contraseña del panel y su secreto (ver `docs/DEPLOY.md` del admin).
  3. Revisar quién tiene acceso a Cloudflare, Vercel, Neon y Cloudinary.

## Seguridad

Si encontrás una vulnerabilidad, **no abras un issue público**: seguí [SECURITY.md](SECURITY.md).

## Licencia

Al contribuir aceptás que tu aporte se publique bajo la [licencia MIT](LICENSE) del proyecto.
