import type { APIContext } from 'astro';
import { getContent } from '../data/content';
import { buildRobotsTxt } from '../lib/seo/robots';

export const GET = ({ site, url }: APIContext) =>
	new Response(buildRobotsTxt(site ?? new URL(url.origin), { preview: getContent().preview }), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
