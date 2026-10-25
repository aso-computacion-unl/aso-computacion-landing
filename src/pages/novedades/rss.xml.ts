import type { APIContext } from 'astro';
import { newsFeed } from '../../views/newsFeed';

export const GET = (context: APIContext) => newsFeed(context, 'es');
