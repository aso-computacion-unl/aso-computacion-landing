// The privacy policy, in both languages. It describes what the admin and the forum (a separate site) really store, so
// change it together with them. Each `body` is the small Markdown subset of src/lib/admin-content/markdown.ts
// (paragraphs, `- ` lists, **bold**); no links, because that renderer's new-tab notice is Spanish only.
import type { Locale } from './locales';

export interface PrivacySection {
	id: string;
	heading: string;
	body: string;
}

export interface PrivacyCopy {
	title: string;
	description: string;
	eyebrow: string;
	lead: string;
	sections: PrivacySection[];
	contact: { id: string; heading: string; before: string; after: string };
}

// ISO date of the last review; bump it with every change of the text.
export const privacyUpdated = '2026-11-05';

export const privacy: Record<Locale, PrivacyCopy> = {
	es: {
		title: 'Política de privacidad',
		description:
			'Qué datos personales guarda ASO Computación en su sitio, su foro y sus inscripciones, para qué los usa, con quién los comparte y cómo pedir su acceso o eliminación.',
		eyebrow: '$ cat PRIVACIDAD.md',
		lead: 'Última actualización: 5 de noviembre de 2026.',
		sections: [
			{
				id: 'responsable',
				heading: 'Quién es responsable',
				body: `ASO Computación, la asociación estudiantil de la carrera de Computación de la Universidad Nacional de Loja (UNL), es responsable del tratamiento de los datos personales que se describen aquí.

Esta política cubre este sitio público y los servicios de la asociación que funcionan en un sitio aparte: el panel de administración del equipo y el foro de estudiantes, donde también se hacen las inscripciones a actividades. El inicio de sesión con Google se usa solo en esos dos servicios.`,
			},
			{
				id: 'datos',
				heading: 'Qué datos recopilamos',
				body: `**Si solo visitas este sitio:** no te pedimos datos y no hay formularios. Los servicios que lo entregan pueden registrar datos técnicos de la visita, como la dirección IP y el navegador.

**Si inicias sesión con Google:** solo se admiten cuentas institucionales verificadas. Guardamos tu nombre, tu correo y el identificador de tu cuenta de Google. No guardamos tu foto de perfil ni accedemos a tus contactos, archivos u otros datos de tu cuenta.

**En el foro:** tu nombre público (tomado de tu nombre en Google; si no es válido, se usa «Estudiante» con un código), tus hilos, respuestas, votos «me sirvió» y reportes. Tu correo no se muestra a otros estudiantes y quien reporta una publicación solo es visible para quienes moderan.

**En las inscripciones a actividades:** si te inscribes con tu cuenta del foro, guardamos tu nombre y tu correo. Si usas el formulario abierto, guardamos el nombre, el correo, la carrera y el semestre que escribes.

**Equipo de la asociación:** de quienes administran el sitio guardamos nombre, correo y rol, un registro de qué se cambió y quién lo hizo (sin el contenido de los cambios) y las invitaciones enviadas (correo y rol).

**Contenido publicado:** la directiva (nombre, cargo y foto), los testimonios (nombre, cargo, cita y, si hay, foto) y las fotos de las actividades se publican en este sitio por decisión de la asociación. Si apareces y quieres que se retire, escríbenos.

**Datos de sesión:** cada inicio de sesión guarda cuándo se creó, cuándo vence y cuándo se usó por última vez, el navegador (texto truncado) y una huella irreversible de la dirección IP, de la que no se puede recuperar la dirección.`,
			},
			{
				id: 'finalidad',
				heading: 'Para qué los usamos',
				body: `- Permitirte iniciar sesión y mantener tu sesión segura.
- Gestionar las inscripciones y los cupos de las actividades.
- Operar y moderar el foro.
- Proteger los servicios contra abusos, con límites de intentos, verificación anti-robots y un registro de cambios.
- Publicar el contenido de la asociación.

Tratamos tus datos con tu consentimiento, que das al iniciar sesión o al enviar una inscripción, y para que la asociación pueda organizar sus actividades y mantener seguros sus servicios. No vendemos tus datos ni los usamos para publicidad ni para crear perfiles.

El uso que hacemos de la información recibida de Google se limita a ofrecer el inicio de sesión y cumple con la Política de datos de usuario de los servicios de API de Google, incluidos sus requisitos de uso limitado.`,
			},
			{
				id: 'terceros',
				heading: 'Con quién los compartimos',
				body: `No vendemos ni cedemos tus datos. Para funcionar usamos proveedores que los procesan por nuestra cuenta:

- **Google:** inicio de sesión.
- **Vercel:** alojamiento del panel y del foro.
- **Neon:** base de datos PostgreSQL donde se guardan los datos.
- **Cloudinary:** almacenamiento y entrega de imágenes; tu navegador las pide directamente a sus servidores.
- **Cloudflare:** alojamiento de este sitio, verificación anti-robots (Turnstile) en el formulario abierto de inscripción y, cuando está activada, estadísticas de visitas sin cookies.
- **Sentry:** aviso de errores técnicos, cuando está configurado; no se envían datos personales por defecto.

Estos proveedores pueden guardar datos fuera de Ecuador. Dentro de la asociación, solo el equipo autorizado accede a las inscripciones y a los datos de las cuentas. Tus publicaciones en el foro las ven otros estudiantes con sesión iniciada. Podemos entregar datos si una autoridad competente lo exige por ley.`,
			},
			{
				id: 'cookies',
				heading: 'Cookies y almacenamiento',
				body: `Este sitio público no usa cookies. Guarda en tu dispositivo solo tu preferencia de tema (claro u oscuro), que no sale de tu navegador, y sirve sus tipografías desde el mismo sitio.

El foro y el panel usan cookies técnicas necesarias para mantener tu sesión. No usamos cookies de publicidad ni de seguimiento.

- Sesión del foro: 7 días.
- Sesión del panel (equipo): 24 horas.
- Paso intermedio del inicio de sesión con Google: 10 minutos.
- Recordatorio de dispositivo del panel (equipo), que solo reduce los límites de intentos: 180 días.`,
			},
			{
				id: 'conservacion',
				heading: 'Cuánto tiempo los conservamos',
				body: `- **Inscripciones:** se eliminan automáticamente 90 días después de que termina la actividad. Si una actividad no tiene fecha, se conservan hasta que se eliminen a solicitud.
- **Sesiones:** la del foro vence a los 7 días y la del panel a las 24 horas.
- **Cuenta del foro, publicaciones y registro de cambios:** no tienen un plazo automático; se conservan mientras sean necesarios para las actividades de la asociación, y puedes pedir que se eliminen.
- **Contenido retirado del panel:** pasa a una papelera hasta que el equipo lo elimina de forma definitiva. Las imágenes reemplazadas o retiradas no se borran solas del almacenamiento: el equipo las limpia a mano.`,
			},
			{
				id: 'derechos',
				heading: 'Tus derechos',
				body: `Puedes pedir acceder a tus datos, corregirlos, eliminarlos u oponerte a su uso, y retirar tu consentimiento en cualquier momento. Escríbenos al correo de contacto e indica qué quieres hacer y con qué cuenta o correo iniciaste sesión o te inscribiste. Responderemos lo antes posible.

También puedes quitar el acceso de la aplicación desde la configuración de tu cuenta de Google.`,
			},
			{
				id: 'cambios',
				heading: 'Cambios a esta política',
				body: 'Si cambiamos esta política, actualizaremos la fecha que aparece al inicio de la página.',
			},
		],
		contact: {
			id: 'contacto',
			heading: 'Contacto',
			before: 'Para cualquier consulta o solicitud sobre tus datos personales, escribe a ',
			after: '.',
		},
	},
	en: {
		title: 'Privacy policy',
		description:
			'What personal data ASO Computación keeps on its site, forum and sign-ups, what it uses it for, who it shares it with, and how to ask for access or deletion.',
		eyebrow: '$ cat PRIVACY.md',
		lead: 'Last updated: November 5, 2026.',
		sections: [
			{
				id: 'responsable',
				heading: 'Who is responsible',
				body: `ASO Computación, the student association of the Computer Science program at the Universidad Nacional de Loja (UNL), is responsible for the personal data described here.

This policy covers this public site and the association's services that run on a separate site: the team's admin panel and the students' forum, where sign-ups for activities are also made. Google sign-in is used only in those two services.`,
			},
			{
				id: 'datos',
				heading: 'What data we collect',
				body: `**If you only visit this site:** we ask for no data and there are no forms. The services that deliver it may log technical details of the visit, such as the IP address and the browser.

**If you sign in with Google:** only verified institutional accounts are accepted. We keep your name, your email and the identifier of your Google account. We do not keep your profile picture, and we do not access your contacts, files or other account data.

**In the forum:** your public name (taken from your Google name; if it is not valid, "Estudiante" plus a code is used), your threads, replies, "me sirvió" votes and reports. Your email is not shown to other students, and the person who reports a post is visible only to moderators.

**In activity sign-ups:** if you sign up with your forum account, we keep your name and email. If you use the open form, we keep the name, email, program and semester you type.

**Association team:** for the people who run the site we keep name, email and role, a record of what was changed and by whom (without the content of the changes), and the invitations sent (email and role).

**Published content:** the board (name, role and photo), testimonials (name, role, quote and, if any, photo) and photos of activities are published on this site at the association's decision. If you appear and want it removed, write to us.

**Session data:** each sign-in stores when it was created, when it expires and when it was last used, the browser (truncated text) and an irreversible fingerprint of the IP address, from which the address cannot be recovered.`,
			},
			{
				id: 'finalidad',
				heading: 'What we use it for',
				body: `- Letting you sign in and keeping your session secure.
- Managing sign-ups and seats for activities.
- Running and moderating the forum.
- Protecting the services against abuse, with attempt limits, anti-bot verification and a record of changes.
- Publishing the association's content.

We process your data with your consent, which you give when you sign in or submit a sign-up, and so that the association can organize its activities and keep its services secure. We do not sell your data or use it for advertising or profiling.

Our use of information received from Google is limited to providing sign-in and complies with the Google API Services User Data Policy, including its Limited Use requirements.`,
			},
			{
				id: 'terceros',
				heading: 'Who we share it with',
				body: `We do not sell or give away your data. To operate we use providers that process it on our behalf:

- **Google:** sign-in.
- **Vercel:** hosting of the panel and the forum.
- **Neon:** the PostgreSQL database where the data is stored.
- **Cloudinary:** storage and delivery of images; your browser requests them directly from its servers.
- **Cloudflare:** hosting of this site, anti-bot verification (Turnstile) on the open sign-up form and, when enabled, cookie-free visit statistics.
- **Sentry:** technical error reports, when configured; no personal data is sent by default.

These providers may store data outside Ecuador. Inside the association, only authorized team members access sign-ups and account data. Your forum posts are seen by other signed-in students. We may hand over data if a competent authority requires it by law.`,
			},
			{
				id: 'cookies',
				heading: 'Cookies and storage',
				body: `This public site does not use cookies. It stores on your device only your theme preference (light or dark), which never leaves your browser, and it serves its fonts from the same site.

The forum and the panel use technical cookies needed to keep your session. We use no advertising or tracking cookies.

- Forum session: 7 days.
- Panel session (team): 24 hours.
- Intermediate step of Google sign-in: 10 minutes.
- Device reminder of the panel (team), which only eases attempt limits: 180 days.`,
			},
			{
				id: 'conservacion',
				heading: 'How long we keep it',
				body: `- **Sign-ups:** deleted automatically 90 days after the activity ends. If an activity has no date, they are kept until deleted on request.
- **Sessions:** the forum's expires after 7 days and the panel's after 24 hours.
- **Forum account, posts and record of changes:** there is no automatic deadline; they are kept while needed for the association's activities, and you can ask for them to be deleted.
- **Content removed from the panel:** goes to a trash until the team deletes it for good. Replaced or removed images are not deleted from storage on their own: the team cleans them up by hand.`,
			},
			{
				id: 'derechos',
				heading: 'Your rights',
				body: `You can ask to access your data, correct it, delete it or object to its use, and withdraw your consent at any time. Write to the contact email and say what you want to do and with which account or email you signed in or signed up. We will reply as soon as we can.

You can also remove the application's access from your Google account settings.`,
			},
			{
				id: 'cambios',
				heading: 'Changes to this policy',
				body: 'If we change this policy, we will update the date shown at the top of the page.',
			},
		],
		contact: {
			id: 'contacto',
			heading: 'Contact',
			before: 'For any question or request about your personal data, write to ',
			after: '.',
		},
	},
};
