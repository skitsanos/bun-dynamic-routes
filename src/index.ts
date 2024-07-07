import {type Context, Hono} from 'hono';
import {createBunWebSocket} from 'hono/bun';
import Logger from '@/utils/logger.ts';
import loadRoutes from '@/utils/loadRoutes.ts';
import loadConfig from '@/utils/config.ts';
import {parseRoutesAtBuildTime} from '@/.routes';

const {config} = await loadConfig('config/server.yaml');

const logger = new Logger('Core');
logger.trace('Starting server...');

const loggerHttp = new Logger('HTTP');

const {
    SERVER_NAME,
    PORT
} = process.env;

const {
    websocket,
    upgradeWebSocket
} = createBunWebSocket();

const app = new Hono();

app.use('*', async (c: Context, next) =>
{
    const start = Bun.nanoseconds();
    await next();
    const end = Bun.nanoseconds();
    c.res.headers.set('X-Response-Time', `${(end - start) / 1000000}`);
    c.res.headers.set('Server', (SERVER_NAME ?? config?.name) || 'bun-service');
    loggerHttp.trace(`${c.req.method} ${c.req.url} - ${c.res.status} - ${c.res.headers.get('X-Response-Time')}ms`);
});

if (import.meta.dir.startsWith('/$bunfs'))
{
    logger.trace('Running in production mode');
    await parseRoutesAtBuildTime({
        app,
        upgradeWebSocket
    });
}
else
{
    logger.trace('Running in development mode');
    await loadRoutes({
        app,
        upgradeWebSocket
    }, 'routes');
}

const server = Bun.serve({
    port: Number(PORT) || config?.server?.port || 3000,
    ...config?.server?.ssl && {
        cert: config.server.ssl.cert,
        key: config.server.ssl.key
    },
    fetch: app.fetch,
    maxRequestBodySize: 200_000_000_000,
    websocket
});

logger.trace(`Server started at ${server.url}`, {url: server.url});
