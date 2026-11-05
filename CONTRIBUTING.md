# Cómo colaborar

Gracias por ayudar con el sitio de ASO Computación. Esta guía es para la directiva y para cualquier estudiante que quiera aportar.

## ¿Quiere cambiar contenido o código?

| Quiero… | Dónde se hace | ¿Necesito Git? |
|---|---|---|
| Publicar un evento y abrir sus inscripciones, subir fotos, publicar una noticia, editar la FAQ (y sus comandos), la directiva, los pilares, los aliados o las redes | En el **panel de administración** (repo `aso-computacion-admin`). El sitio se reconstruye solo unos segundos después de guardar. | No |
| Cambiar textos fijos (hero, manifiesto, menú, foro, sección de ideas), el diseño o el código | En **este repositorio**, con un Pull Request | Sí |
| Reportar un error o proponer una idea | Abriendo un **issue** en este repositorio | No |

Las inscripciones y el foro se atienden en el panel, no en este sitio: aquí solo se muestran los boletos y se enlaza. Para entender cómo encajan las dos piezas, consulte la [arquitectura del sistema](https://github.com/aso-computacion-unl/aso-computacion-admin/blob/main/docs/ARQUITECTURA.md) y la [referencia técnica del sitio](docs/REFERENCIA.md).

Si no sabe por dónde empezar, abra un issue y lo revisamos juntos.

## Preparar el entorno local

Se hace una sola vez. Necesita **Node 22.23.4 o superior**, **[pnpm](https://pnpm.io) 10** (la CI usa la 10.33.2) y Git. No necesita base de datos ni Docker: la landing es un sitio estático.

1. **Instalar:**
   ```sh
   pnpm install
   pnpm exec playwright install chromium   # una vez, para los tests de punta a punta
   ```
2. **Arrancar:** `pnpm dev` y abra <http://localhost:4321>.
3. **Contenido.** Sin configurar nada, el sitio usa la copia incluida en el repositorio (`src/data/fallback.json`), con etiquetas «demo» en lo que es de ejemplo. Para ver el contenido real, defina `ADMIN_CONTENT_URL` en un archivo `.env` con la URL completa de `/api/public/content` del panel: la de producción o la de su panel local (`http://localhost:3000/api/public/content`, ver el [entorno local del admin](https://github.com/aso-computacion-unl/aso-computacion-admin/blob/main/CONTRIBUTING.md#preparar-el-entorno-local)). El archivo `.env` nunca se sube a Git.

Si algo falla en estos pasos, abra un issue: es un error de la guía, no suyo.

## Flujo de trabajo y colaboración

El orden es siempre el mismo, sea cual sea su rol:

1. **Issue primero.** Para algo más grande que un error de tipeo, abra o elija un issue y comente que lo toma.
2. **Rama nueva desde `main` actualizado:**
   ```sh
   git switch main && git pull
   git switch -c tipo/descripcion-corta   # ej.: fix/menu-movil, feat/seccion-galeria
   ```
3. **Commits pequeños** con [Conventional Commits](https://www.conventionalcommits.org/es/): `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`. El mensaje describe el cambio en inglés, en imperativo: `fix: align social tiles on mobile`.
4. **Compruebe localmente** con el [entorno local](#preparar-el-entorno-local) listo; la CI corre lo mismo en el PR:
   ```sh
   pnpm lint
   pnpm check          # astro check: tipos de .astro y .ts
   pnpm format:check   # pnpm format lo arregla
   pnpm test
   pnpm build
   pnpm test:e2e       # sobre el build de recién
   ```
   Prettier no formatea los `.md`, pero sí el resto del repositorio. Si modificó algo visual, revíselo con `pnpm dev` en celular (390 px) y escritorio, también con movimiento reducido y en el tema claro. Los detalles de las pruebas y de Lighthouse están en [docs/REFERENCIA.md](docs/REFERENCIA.md#tests).
5. **Abra el PR** contra `main`, complete la plantilla y enlace el issue (`Closes #12`).
6. **Revisión.** Responda los comentarios con commits nuevos en la misma rama; no reescriba la historia de una rama que ya está en revisión.
7. **Merge.** Quien aprueba (o quien abrió el PR, una vez aprobado) hace el merge y borra la rama.

### Reglas de la rama `main`

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

### Tamaño de los PRs

Un PR debería poder revisarse en menos de una hora: idealmente **menos de 400 líneas cambiadas**. Si es más grande, divídalo en varios PRs que se puedan revisar por separado.

### Cambios que tocan los dos repositorios

Si necesita un dato nuevo del panel, el cambio empieza en [`aso-computacion-admin`](https://github.com/aso-computacion-unl/aso-computacion-admin) y termina aquí:

1. Primero se mergea el PR del panel que agrega el campo a `/api/public/content`.
2. Después, el de la landing: el tipo en `src/lib/admin-content/types.ts`, su validación en `validate.ts` y el mismo campo en `src/data/fallback.json` (la copia se valida igual que la respuesta del panel; si no lo trae, el build falla).
3. Enlace cada PR desde el otro.
4. Si el panel cambia la versión del contrato, la landing la acepta subiendo `PUBLIC_CONTENT_VERSION`: hasta entonces rechaza el contenido nuevo.

## Guía por rol

Un mismo PR puede tocar varios roles; lea las secciones que le correspondan.

### Frontend

Es el rol principal de este repositorio. El sitio usa **Astro**, **Tailwind 4** y TypeScript; el movimiento (GSAP y Lenis) se carga solo cuando hace falta.

| Dónde | Qué hay |
|---|---|
| `src/pages/` | Las rutas: inicio, novedades, la versión en inglés (`en/`) y el 404 |
| `src/views/` | El armado de cada página (inicio, lista de novedades, noticia) |
| `src/components/` | Las secciones y piezas de la página (`Hero`, `Faq`, `Board`, `Ticket`…) |
| `src/i18n/` | Los textos fijos en español e inglés (`ui.ts`) |
| `src/styles/global.css` | Los tokens de diseño (colores y escala tipográfica) en el bloque `@theme` |
| `src/lib/admin-content/` | La lectura y validación del contenido del panel |

**Reglas prácticas:**

- Use los tokens del tema (`text-body`, `text-ink`…) en lugar de tamaños o colores sueltos: hay tests que fijan la escala tipográfica.
- Un texto fijo nuevo va en español **y** en inglés, en `src/i18n/ui.ts`.
- El contenido que edita la directiva (eventos, noticias, FAQ…) no se escribe aquí: llega del panel.
- Las imágenes del contenido vienen de Cloudinary; no agregue imágenes de internet sin licencia.
- Revise cada cambio en **390 px** y en escritorio, con movimiento reducido, en el tema claro y con el teclado (Tab).
- Si su cambio se ve, agregue capturas de antes y después en el PR.

### QA

QA no necesita escribir código para aportar: probar, reproducir y reportar bien también es colaborar.

**Probar y reportar:**

- Pruebe el sitio publicado o su copia local, en celular y escritorio, en español e inglés y en los dos temas.
- Reporte cada error con la plantilla **Bug** de los issues: qué pasó, cómo se reproduce paso a paso, dispositivo y navegador, y capturas.
- Si el error está en un dato (una fecha, una foto, un texto de evento), no es de este repositorio: avísele a la directiva para que lo corrija en el panel.
- Para revisar un PR, bájelo (`gh pr checkout <número>`), pruébelo y comente lo que encontró.

**Pruebas automatizadas:**

| Nivel | Dónde | Comando |
|---|---|---|
| Unitarias | Junto a cada módulo, como `*.test.ts` en `src/` | `pnpm test` |
| Punta a punta y accesibilidad | `e2e/*.spec.ts` (Playwright con axe-core) | `pnpm build && pnpm test:e2e` |
| Rendimiento, accesibilidad y SEO | `lighthouserc.json` | `pnpm build && pnpm lighthouse` |

- Lighthouse exige como mínimo 0,9 en rendimiento y 0,95 en accesibilidad y buenas prácticas. Los umbrales no se bajan para que un PR pase.
- `e2e/built-from-admin.spec.ts` construye el sitio contra un panel simulado: es el que detecta si se rompe el contrato con el panel.

### Backend

La landing **no tiene backend**: es un sitio estático que lee el contenido del panel al construirse. La API, la base de datos, el foro y las inscripciones viven en [`aso-computacion-admin`](https://github.com/aso-computacion-unl/aso-computacion-admin); su guía de backend está en su [CONTRIBUTING.md](https://github.com/aso-computacion-unl/aso-computacion-admin/blob/main/CONTRIBUTING.md#backend). Aquí solo se toca la lectura de ese contenido (`src/lib/admin-content/`), siguiendo los pasos de [cambios que tocan los dos repositorios](#cambios-que-tocan-los-dos-repositorios).

## Buenas prácticas para la directiva

- **Secretos fuera de Git.** Nunca suba archivos `.env`, contraseñas, tokens ni URLs de deploy hooks. Las credenciales se comparten por un gestor de contraseñas, no por WhatsApp ni en un issue.
- **Fotos con permiso.** Solo publique fotos de eventos en las que las personas aceptaron aparecer. De la directiva se publica nombre, cargo y foto; nada de teléfonos, correos ni cédulas.
- **Imágenes con licencia.** Las imágenes de `src/assets/demo/` son de Unsplash y solo están de ejemplo (ver `SOURCES.md`). Reemplácelas por fotos reales de ASO; no agregue imágenes de internet sin licencia.
- **Revisiones amables.** Comente el código, no a la persona. Si algo no queda claro, pregunte.
- **Cambio de directiva.** Cuando cambia la directiva:
  1. Sumar a las personas nuevas a la organización de GitHub y quitar a quienes salen.
  2. Rotar la contraseña del panel y su secreto (ver `docs/DEPLOY.md` del admin).
  3. Revisar quién tiene acceso a Cloudflare, Vercel, Neon y Cloudinary.

## Seguridad

Si encuentra una vulnerabilidad, **no abra un issue público**: siga [SECURITY.md](SECURITY.md).

## Licencia

Al contribuir, usted acepta que su aporte se publique bajo la [licencia MIT](LICENSE) del proyecto.
