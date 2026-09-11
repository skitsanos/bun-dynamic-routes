import {ALLOWED_METHODS, type Query, type RouteContext, type RouteMethod, type RouteModule} from '../core/types.ts';

export const UPGRADED = Symbol('upgraded');
const isMethod = (method: string): method is RouteMethod => ALLOWED_METHODS.includes(method as RouteMethod);
export const loadRoute = async (path: string): Promise<RouteModule> =>
{
    // ESM already caches modules. A second cache would retain stale hot-reload references.
    const route = await import(path) as RouteModule;
    for (const method of [...ALLOWED_METHODS, 'default'] as const)
        if (route[method] !== undefined && typeof route[method] !== 'function')
            throw new Error(`Invalid ${method} handler in ${path}`);
    if (route.websocket && (typeof route.websocket.upgrade !== 'function' || typeof route.websocket.message !== 'function'))
        throw new Error(`WebSocket route requires upgrade and message handlers: ${path}`);
    if (!route.default && !route.websocket && !ALLOWED_METHODS.some(method => route[method]))
        throw new Error(`Route exports no handler: ${path}`);
    return route;
};
export const allowedMethods = (route: RouteModule): RouteMethod[] =>
{
    if (route.default) return [...ALLOWED_METHODS];
    return ALLOWED_METHODS.filter(method => route[method] || method === 'OPTIONS'
        || (method === 'HEAD' && route.GET) || (method === 'GET' && route.websocket));
};
export const parseQuery = (url: URL): Query =>
{
    const query: Query = Object.create(null);
    for (const [key, value] of url.searchParams)
    {
        const previous = query[key];
        if (previous === undefined) query[key] = value;
        else if (Array.isArray(previous)) previous.push(value);
        else query[key] = [previous, value];
    }
    return query;
};
export const resolveRoute = async (route: RouteModule, context: RouteContext): Promise<Response | typeof UPGRADED> =>
{
    const {req, server} = context;
    const method = req.method;
    if (method === 'GET' && route.websocket && req.headers.get('Upgrade')?.toLowerCase() === 'websocket')
    {
        const decision = await route.websocket.upgrade(context);
        if (decision?.accept !== true)
            return decision?.accept === false ? decision.response : new Response('Forbidden', {status: 403});
        const upgraded = server.upgrade(req, {data: {
            websocket: route.websocket, context: decision.context ?? {},
            pathname: context.pathname, query: context.query, params: context.params
        }});
        return upgraded ? UPGRADED : new Response('WebSocket upgrade failed', {status: 400});
    }
    const handler = isMethod(method)
        ? route[method] ?? (method === 'HEAD' ? route.GET : undefined) ?? route.default : undefined;
    if (handler) return await handler(context) ?? new Response(null, {status: 204});
    if (method === 'OPTIONS') return new Response(null, {status: 204, headers: {Allow: allowedMethods(route).join(', ')}});
    if (method === 'GET' && route.websocket)
        return new Response('Upgrade Required', {status: 426, headers: {Upgrade: 'websocket'}});
    return new Response('Method Not Allowed', {status: 405, headers: {Allow: allowedMethods(route).join(', ')}});
};
