import type {AppConfig} from '../core/configuration.ts';
import type {RouteMethod, SocketData} from '../core/types.ts';
import {applyCorsHeaders, handleCors} from '../utils/cors.ts';
import Logger from '../utils/logger.ts';
import {isDevelopment, publicDir, routesDir} from '../utils/runtime.ts';
import {findStaticFile, serveStatic} from '../utils/staticFiles.ts';
import {allowedMethods, loadRoute, parseQuery, resolveRoute, UPGRADED} from './router.ts';
import {createWebSockets} from './websockets.ts';

const logger = new Logger('HTTP');
const staticMethods: RouteMethod[] = ['GET', 'HEAD', 'OPTIONS'];
export const createServer = async (config: AppConfig) =>
{
    const router = new Bun.FileSystemRouter({style: 'nextjs', dir: routesDir, fileExtensions: ['.ts', '.tsx']});
    await Promise.all(Object.values(router.routes).map(loadRoute));
    const websocket = createWebSockets();
    const fetchHandler = async (request: Request, server: Bun.Server<SocketData>): Promise<Response | undefined> =>
    {
        const started = Bun.nanoseconds();
        const url = new URL(request.url);
        const clientIp = (config.server.trustProxy
            ? request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || request.headers.get('X-Real-IP') : null)
            ?? server.requestIP(request)?.address ?? 'unknown';
        let response: Response;
        try
        {
            try { decodeURIComponent(url.pathname); }
            catch { return finish(new Response('Bad Request', {status: 400})); }
            const staticPath = await findStaticFile(url.pathname, publicDir);
            let matched = staticPath ? null : router.match(request);
            if (!staticPath && !matched && isDevelopment)
            {
                router.reload();
                matched = router.match(request);
            }
            if (!staticPath && !matched) response = new Response('Not Found', {status: 404});
            else
            {
                const route = matched ? await loadRoute(matched.filePath) : null;
                const methods = route ? allowedMethods(route) : staticMethods;
                const preflight = handleCors(request, methods, config.server.cors);
                if (preflight) response = preflight;
                else if (staticPath)
                {
                    response = request.method === 'GET' || request.method === 'HEAD' ? serveStatic(request, staticPath)
                        : new Response(request.method === 'OPTIONS' ? null : 'Method Not Allowed', {
                            status: request.method === 'OPTIONS' ? 204 : 405,
                            headers: {Allow: methods.join(', ')}
                        });
                }
                else if (route && matched)
                {
                    const resolved = await resolveRoute(route, {
                        req: request, server, params: matched.params ?? {}, query: parseQuery(url), pathname: url.pathname
                    });
                    if (resolved === UPGRADED)
                    {
                        logger.debug(`WS ${url.pathname}`, {status: 101, clientIp});
                        return undefined;
                    }
                    response = resolved;
                }
                else response = new Response('Not Found', {status: 404});
            }
        }
        catch (error)
        {
            logger.error('Unhandled request error', {method: request.method, path: url.pathname, error});
            response = new Response('Internal Server Error', {status: 500});
        }
        return finish(response);
        function finish(result: Response): Response
        {
            const durationMs = ((Bun.nanoseconds() - started) / 1_000_000).toFixed(3);
            result.headers.set('X-Response-Time', `${durationMs}ms`);
            result.headers.set('Server', config.serviceName);
            applyCorsHeaders(result, request, config.server.cors);
            const level = result.status >= 500 ? 'error' : result.status >= 400 ? 'warn' : 'trace';
            logger[level](`${request.method} ${url.pathname}`, {status: result.status, durationMs, clientIp});
            return result;
        }
    };
    const server = Bun.serve<SocketData>({
        hostname: config.server.hostname, port: config.server.port, tls: config.server.ssl,
        maxRequestBodySize: config.server.maxRequestBodySize, fetch: fetchHandler, websocket: websocket.handlers
    });
    return {server, sockets: websocket.sockets};
};
