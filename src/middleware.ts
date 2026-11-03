import { defineMiddleware } from 'astro:middleware';
import { refreshContent } from './data/content';

// In `astro dev`, give a server that started while the admin was down the chance to pick its content up on the next
// request. In a build `refreshContent` does nothing: the content is resolved once and the production gate decides.
export const onRequest = defineMiddleware(async (_context, next) => {
	await refreshContent();
	return next();
});
