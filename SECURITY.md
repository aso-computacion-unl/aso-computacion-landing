# Política de seguridad

## Cómo reportar una vulnerabilidad

No abra un issue público. Use el reporte privado de GitHub:

1. Pestaña **Security** de este repositorio.
2. **Report a vulnerability**.
3. Describa qué encontró, cómo reproducirlo y qué impacto tiene.

Solo la directiva y quien mantiene el proyecto ven el reporte. Respondemos en cuanto podamos; es un proyecto estudiantil voluntario, así que pedimos paciencia.

## Qué cuenta

- Credenciales, tokens o datos personales expuestos en el código, en el sitio o en un build (por ejemplo, un código de vista previa o una URL de deploy hook).
- Formas de alterar el contenido publicado sin pasar por el panel de administración, o de hacer que el sitio publique borradores, contenido de ejemplo o enlaces hacia un origen distinto del panel.
- Contenido del panel que llegue a ejecutarse como código en el sitio (el texto de las noticias, por ejemplo, debería mostrarse siempre como texto).
- Cualquier fallo del panel de administración (login, sesiones, roles, subida de imágenes, inscripciones a eventos, foro). El sitio solo muestra los boletos y enlaza al panel: lo que una persona escribe al inscribirse o en el foro se guarda y se valida allí.

## Qué ya hace el sitio

Para que su reporte sea más preciso, estas son las defensas que hoy tiene (detalle en [docs/REFERENCIA.md](docs/REFERENCIA.md)):

- Es estático: no hay servidor, formulario ni cookie propios. Las inscripciones y el foro viven en el panel.
- El contenido del panel se valida al construir el sitio (forma, largos, imágenes solo de Cloudinary, enlaces `https`) y se escapa al mostrarlo; el Markdown de las noticias no admite HTML y el JSON-LD no puede cerrar su etiqueta `<script>`.
- Los enlaces de inscripción, calendario y foro solo se aceptan hacia el origen del panel; los de otro origen se descartan.
- Respuestas con `Content-Security-Policy` (`frame-ancestors 'none'`, `base-uri 'self'`, `object-src 'none'`), `X-Content-Type-Options` y `Referrer-Policy` (`public/_headers`). No hay `script-src` todavía porque el sitio usa scripts en línea.
- Una vista previa de borradores no se puede construir en el proyecto público y no se indexa; el código de vista previa caduca.
- La CI audita las dependencias de producción (`pnpm audit`, falla con avisos altos o críticos), y Dependabot propone actualizaciones cada semana.

## Qué no hacer

- No pruebe ataques contra el sitio en producción ni contra cuentas de otras personas.
- No acceda a datos que no le pertenecen más allá de lo necesario para demostrar el problema.
