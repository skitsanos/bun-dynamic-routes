import {join} from 'node:path';
import config from '@/core/configuration.ts';
import {applyCorsHeaders, handleCors} from '@/utils/cors.ts';
import Logger, {LogLevel} from '@/utils/logger.ts';
import {serveStatic} from '@/utils/staticFiles.ts';

const isCompiled = process.execPath !== Bun.which('bun');
const baseDir = isCompiled ? process.cwd() : new URL('..', import.meta.url).pathname;
const publicDir = join(baseDir, 'public');

const logger = new Logger('Core', LogLevel.TRACE);
const loggerHttp = new Logger('HTTP', LogLevel.TRACE);

const {
    SERVER_NAME,
    PORT
} = process.env;

logger.trace('Starting server...');

type RouteMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
const ALLOWED_METHODS: RouteMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

type RouteHandler = (context: RouteContext) => Promise<Response | undefined> | Response | undefined;

interface RouteModule {
    GET?: RouteHandler;
    POST?: RouteHandler;
    PUT?: RouteHandler;
    PATCH?: RouteHandler;
    DELETE?: RouteHandler;
    HEAD?: RouteHandler;
    OPTIONS?: RouteHandler;
    default?: RouteHandler;
    websocket?: RouteWebSocketHandler;
}

interface RouteContext {
    req: Request;
    params: Record<string, string>;
    query: Record<string, string>;
    pathname: string;
    server: Bun.Server<SocketData>;
}

type RouteWebSocketHandler = {
    open?: (ws: any) => void | Promise<void>;
    message: (ws: any, message: string | Buffer) => void | Promise<void>;
    close?: (ws: any, code: number, reason: string) => void | Promise<void>;
    error?: (ws: any, error: Error) => void | Promise<void>;
};

type SocketData = {
    websocket?: RouteWebSocketHandler;
    pathname: string;
    query: Record<string, string>;
    params: Record<string, string>;
};

const routesDirectory = isCompiled ? join(process.cwd(), 'src', 'routes') : new URL('./routes', import.meta.url).pathname;

const fileRouter = new Bun.FileSystemRouter({
    style: 'nextjs',
    dir: routesDirectory,
    fileExtensions: ['.ts', '.tsx']
});

const routeModules = new Map<string, RouteModule>();
const websocketHandlers: RouteWebSocketHandler = {
    open: (ws) =>
    {
        const websocketHandler = ws.data?.websocket;
        websocketHandler?.open?.(ws);
    },
    message: (ws, message) =>
    {
        const websocketHandler = ws.data?.websocket;
        websocketHandler?.message?.(ws, message as never);
    },
    close: (ws, code, reason) =>
    {
        const websocketHandler = ws.data?.websocket;
        websocketHandler?.close?.(ws, code, reason);
    },
    error: (ws, error) =>
    {
        const websocketHandler = ws.data?.websocket;
        websocketHandler?.error?.(ws, error);
    }
};

const loadRouteModule = async (filePath: string): Promise<RouteModule> =>
{
    const cached = routeModules.get(filePath);
    if (cached)
    {
        return cached;
    }
    const routeModule = await import(filePath) as RouteModule;
    routeModules.set(filePath, routeModule);
    return routeModule;
};

const createResponse = (body = '', status = 200, headers: HeadersInit = {}) => new Response(body, {status, headers});

const getClientIp = (request: Request): string =>
{
    const xForwardedFor = request.headers.get('x-forwarded-for');
    const forwardedIp = xForwardedFor?.split(',')[0]?.trim();

    return forwardedIp || request.headers.get('x-real-ip') || 'unknown';
};

const toMs = (nanoseconds: number): number =>
{
    return nanoseconds / 1_000_000;
};

const isRouteMethod = (method: string): method is RouteMethod =>
{
    return ALLOWED_METHODS.includes(method as RouteMethod);
};

const getAllowedMethods = (route: RouteModule): RouteMethod[] =>
{
    const allowed = ALLOWED_METHODS.filter((method) => route[method]);
    return allowed.length > 0 ? allowed : (route.default ? ALLOWED_METHODS : []);
};

const requestHandler = async (request: Request, server: Bun.Server<SocketData>) =>
{
    const start = Bun.nanoseconds();
    const requestUrl = new URL(request.url);

    // Handle CORS preflight
    const preflightResponse = handleCors(request, config.server.cors);
    if (preflightResponse)
    {
        return preflightResponse;
    }

    // Serve static files from public/
    if (request.method === 'GET' || request.method === 'HEAD')
    {
        const staticResponse = await serveStatic(requestUrl.pathname, publicDir);
        if (staticResponse)
        {
            return staticResponse;
        }
    }

    let matchedRoute: string | null = null;
    let response: Response | undefined;
    let matched: ReturnType<typeof fileRouter.match> | null = null;

    try
    {
        matched = fileRouter.match(request);

        if (!matched)
        {
            response = createResponse('Not Found', 404, {'Content-Type': 'text/plain'});
        }
        else
        {
            matchedRoute = matched.filePath;
            const route = await loadRouteModule(matched.filePath);
            const context: RouteContext = {
                req: request,
                pathname: matched.pathname,
                query: matched.query ?? {},
                params: matched.params ?? {},
                server
            };
            const method = request.method.toUpperCase();

            const isWebSocketUpgrade = request.headers.get('upgrade')?.toLowerCase() === 'websocket';
            if (isWebSocketUpgrade && method === 'GET' && route.websocket)
            {
                const upgrade = server.upgrade(request, {
                    data: {
                        websocket: route.websocket,
                        pathname: context.pathname,
                        query: context.query,
                        params: context.params
                    }
                });

                response = upgrade
                    ? new Response(null, {status: 101})
                    : createResponse('WebSocket upgrade failed', 400);
            }
            else
            {
                const handler = isRouteMethod(method)
                    ? route[method]
                    : undefined;
                const routeHandler = handler ?? route.default;

                if (!routeHandler)
                {
                    const allowed = getAllowedMethods(route);
                    response = createResponse(`Method ${method} Not Allowed`, 405, {
                        'Content-Type': 'text/plain',
                        Allow: allowed.length > 0 ? allowed.join(', ') : 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS'
                    });
                }
                else
                {
                    response = await routeHandler(context);

                    if (!response)
                    {
                        response = createResponse('', 204);
                    }
                }
            }
        }
    }
    catch (error)
    {
        logger.error('Unhandled request error', {
            method: request.method,
            path: requestUrl.pathname,
            error
        });
        response = createResponse('Internal Server Error', 500);
    }

    const end = Bun.nanoseconds();
    const duration = toMs(end - start);
    if (request.headers.get('upgrade')?.toLowerCase() === 'websocket' && response?.status === 101)
    {
        return response;
    }

    const finalResponse = response ?? createResponse('Internal Server Error', 500);

    finalResponse.headers.set('X-Response-Time', `${duration.toFixed(3)}`);
    finalResponse.headers.set('Server', (SERVER_NAME ?? config?.serviceName) || 'bun-service');
    applyCorsHeaders(finalResponse, request, config.server.cors);
    const logLevel = finalResponse.status >= 500 ? 'error'
        : finalResponse.status >= 400 ? 'warn'
            : 'trace';
    loggerHttp[logLevel](`${request.method} ${requestUrl.pathname}`, {
        status: finalResponse.status,
        durationMs: duration.toFixed(3),
        clientIp: getClientIp(request),
        route: matchedRoute
    });

    return finalResponse;
};

const server = Bun.serve({
    port: Number(PORT) || config.server.port || 3000,
    ...config.server.ssl && {
        cert: config.server.ssl.cert,
        key: config.server.ssl.key
    },
    maxRequestBodySize: 50 * 1024 * 1024, // 50MB
    fetch: requestHandler,
    websocket: websocketHandlers
});

logger.trace(`Server started at ${server.url}`, {url: server.url});
