import type {RouteHandler} from '../../core/types.ts';
export const GET: RouteHandler = () => Response.redirect('/docs/readme', 302);
