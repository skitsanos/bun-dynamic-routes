import config from '@/core/configuration.ts';
import {
    ALLOWED_METHODS,
    type RouteContext,
    type RouteMethod,
    type RouteModule,
    type RouteWebSocketHandler,
    type SocketData
} from '@/core/types.ts';
import {applyCorsHeaders, handleCors} from '@/utils/cors.ts';
import Logger, {LogLevel, setDefaultLogLevel} from '@/utils/logger.ts';
import {isDevelopment, publicDir, routesDir} from '@/utils/runtime.ts';
import {serveStatic} from '@/utils/staticFiles.ts';

// Precedence: LOG_LEVEL env var (already picked up by the logger) beats
// config/server.yaml, so only apply the file value when the env var is absent.
if (!process.env.LOG_LEVEL)
{
    setDefaultLogLevel(LogLevel[config.logLevel]);
}

const logger = new Logger('Core');
const loggerHttp = new Logger('HTTP');

const {
    SERVER_NAME,
    PORT
} = process.env;

logger.debug('Starting server...');

const fileRouter = new Bun.FileSystemRouter({
    style: 'nextjs',
    dir: routesDir,
    fileExtensions: ['.ts', '.tsx']
});

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

/**
 * No local cache here on purpose: the ESM registry already memoises modules, and a
 * `Map` kept stale references alive across `bun --hot` reloads.
 */
const loadRouteModule = async (filePath: string): Promise<RouteModule> =>
    await import(filePath) as RouteModule;

/**
 * Imports every route once at boot so a broken route file fails immediately and
 * loudly, instead of surfacing as a 500 on whichever request happens to hit it
 * first. Also warms the module registry so the first request is not penalised.
 */
const preloadRoutes = async (): Promise<void> =>
{
    const entries = Object.entries(fileRouter.routes);
    const failures: string[] = [];

    await Promise.all(entries.map(async ([routePath, filePath]) =>
    {
        try
        {
            const routeModule = await loadRouteModule(filePath);
            const handlers = getAllowedMethods(routeModule);

            if (handlers.length === 0 && !routeModule.websocket)
            {
                logger.warn(`Route ${routePath} exports no handler and will always 405`, {file: filePath});
            }
        }
        catch (error)
        {
            failures.push(routePath);
            logger.error(`Failed to load route ${routePath}`, {file: filePath, error});
        }
    }));

    if (failures.length > 0)
    {
        logger.fatal(`${failures.length} route(s) failed to load`, {routes: failures});
        process.exit(1);
    }

    logger.debug(`Loaded ${entries.length} route(s)`);
};

const createResponse = (body = '', status = 200, headers: HeadersInit = {}) => new Response(body, {status, headers});

/**
 * Forwarding headers are client-controlled, so they are only consulted when the
 * deployment declares that it sits behind a proxy that rewrites them.
 */
const getClientIp = (request: Request, server: Bun.Server<SocketData>): string =>
{
    if (config.server.trustProxy)
    {
        const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
        const realIp = forwardedIp || request.headers.get('x-real-ip');

        if (realIp)
        {
            return realIp;
        }
    }

    return server.requestIP(request)?.address ?? 'unknown';
};

const toMs = (nanoseconds: number): number =>
{
    return nanoseconds / 1_000_000;
};

const isRouteMethod = (method: string): method is RouteMethod =>
{
    return ALLOWED_METHODS.includes(method as RouteMethod);
};

const isWellFormedPath = (pathname: string): boolean =>
{
    try
    {
        decodeURIComponent(pathname);
        return true;
    }
    catch
    {
        return false;
    }
};

const getAllowedMethods = (route: RouteModule): RouteMethod[] =>
{
    const explicit = ALLOWED_METHODS.filter((method) => route[method]);
    if (explicit.length > 0)
    {
        return explicit;
    }

    if (route.default)
    {
        return ALLOWED_METHODS;
    }

    // A websocket-only route does answer GET, but solely as an upgrade handshake.
    return route.websocket ? ['GET'] : [];
};

type MatchedRoute = NonNullable<ReturnType<typeof fileRouter.match>>;

/** The request became a WebSocket connection - Bun owns the socket, so no Response. */
const UPGRADED = Symbol('upgraded');

const resolveRoute = async (
    request: Request,
    server: Bun.Server<SocketData>,
    matched: MatchedRoute
): Promise<Response | typeof UPGRADED> =>
{
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

        // Bun takes ownership of the socket; returning a Response here is not the
        // documented contract, so signal "no response" to the caller instead.
        return upgrade ? UPGRADED : createResponse('WebSocket upgrade failed', 400);
    }

    const handler = isRouteMethod(method)
        ? route[method]
        : undefined;
    const routeHandler = handler ?? route.default;

    if (!routeHandler)
    {
        // A plain request to a websocket-only route is a missing upgrade, not a
        // wrong method - 426 says exactly that.
        if (route.websocket && method === 'GET')
        {
            return createResponse('Upgrade Required', 426, {
                'Content-Type': 'text/plain',
                Upgrade: 'websocket',
                Connection: 'Upgrade'
            });
        }

        const allowed = getAllowedMethods(route);

        // Advertise only what the route genuinely serves - the old fallback listed
        // every verb, which was actively misleading for websocket-only routes.
        return createResponse(`Method ${method} Not Allowed`, 405, {
            'Content-Type': 'text/plain',
            Allow: allowed.join(', ')
        });
    }

    return await routeHandler(context) ?? createResponse('', 204);
};

const requestHandler = async (request: Request, server: Bun.Server<SocketData>) =>
{
    const start = Bun.nanoseconds();
    const requestUrl = new URL(request.url);
    // Resolved up front: `server.requestIP()` returns null once a socket has been
    // handed off to the WebSocket upgrade.
    const clientIp = getClientIp(request, server);

    // Handle CORS preflight
    const preflightResponse = handleCors(request, config.server.cors);
    if (preflightResponse)
    {
        return preflightResponse;
    }

    let matchedRoute: string | null = null;
    let response: Response | undefined;
    let upgraded = false;

    try
    {
        if (!isWellFormedPath(requestUrl.pathname))
        {
            // Both decodeURIComponent and fileRouter.match throw on malformed
            // percent-encoding. That is a client mistake, not a server fault.
            response = createResponse('Bad Request', 400, {'Content-Type': 'text/plain'});
        }
        else if (request.method === 'GET' || request.method === 'HEAD')
        {
            // Static files from public/ fall through to the shared response pipeline
            // below, so they pick up CORS, timing and access logging just like routes.
            const staticResponse = await serveStatic(
                requestUrl.pathname,
                publicDir,
                request.headers.get('if-none-match')
            );

            if (staticResponse)
            {
                matchedRoute = 'static';
                response = staticResponse;
            }
        }

        if (!response)
        {
            let matched = fileRouter.match(request);

            // The router caches its file table at construction, so a route file added
            // after startup never matches. Rescan once before giving up, which keeps
            // `bun --hot` usable without paying for a directory scan on every request.
            if (!matched && isDevelopment)
            {
                fileRouter.reload();
                matched = fileRouter.match(request);
            }

            if (!matched)
            {
                response = createResponse('Not Found', 404, {'Content-Type': 'text/plain'});
            }
            else
            {
                matchedRoute = matched.filePath;
                const resolved = await resolveRoute(request, server, matched);

                if (resolved === UPGRADED)
                {
                    upgraded = true;
                }
                else
                {
                    response = resolved;
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

    const duration = toMs(Bun.nanoseconds() - start);

    if (upgraded)
    {
        loggerHttp.debug(`WS ${requestUrl.pathname}`, {
            status: 101,
            clientIp,
            route: matchedRoute
        });

        return undefined;
    }

    const finalResponse = response ?? createResponse('Internal Server Error', 500);

    finalResponse.headers.set('X-Response-Time', `${duration.toFixed(3)}ms`);
    finalResponse.headers.set('Server', (SERVER_NAME ?? config?.serviceName) || 'bun-service');
    applyCorsHeaders(finalResponse, request, config.server.cors);

    const logLevel = finalResponse.status >= 500 ? 'error'
        : finalResponse.status >= 400 ? 'warn'
            : 'trace';
    loggerHttp[logLevel](`${request.method} ${requestUrl.pathname}`, {
        status: finalResponse.status,
        durationMs: duration.toFixed(3),
        clientIp,
        route: matchedRoute
    });

    return finalResponse;
};

// `Number(PORT) || fallback` swallowed PORT=0, which is the documented way to ask
// the OS for an ephemeral port.
const resolvePort = (): number =>
{
    if (PORT === undefined || PORT.trim() === '')
    {
        return config.server.port;
    }

    const parsed = Number(PORT);

    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535)
    {
        logger.fatal(`Invalid PORT: ${PORT}`);
        process.exit(1);
    }

    return parsed;
};

await preloadRoutes();

const server = Bun.serve({
    port: resolvePort(),
    ...config.server.ssl && {
        cert: config.server.ssl.cert,
        key: config.server.ssl.key
    },
    maxRequestBodySize: config.server.maxRequestBodySize,
    fetch: requestHandler,
    websocket: websocketHandlers
});

logger.info(`Server started at ${server.url}`, {url: server.url});

/**
 * Stop accepting connections and let in-flight requests finish before exiting,
 * so orchestrators (Docker, Kubernetes) get a clean shutdown instead of a kill.
 */
let shuttingDown = false;

const shutdown = async (signal: string): Promise<void> =>
{
    if (shuttingDown)
    {
        return;
    }
    shuttingDown = true;

    logger.info(`Received ${signal}, shutting down...`);

    try
    {
        await server.stop();
        logger.info('Server stopped');
        process.exit(0);
    }
    catch (error)
    {
        logger.error('Error during shutdown', {error});
        process.exit(1);
    }
};

for (const signal of ['SIGINT', 'SIGTERM'] as const)
{
    process.on(signal, () => void shutdown(signal));
}
