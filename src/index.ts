import {type Context, Hono} from 'hono';
import {createBunWebSocket} from 'hono/bun';
import Logger from '@/utils/logger.ts';
import loadRoutes from '@/utils/loadRoutes.ts';

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
    c.res.headers.set('Server', 'bun-service');
});

await loadRoutes({app, upgradeWebSocket}, 'routes');

const server = Bun.serve({
    fetch: app.fetch,
    websocket
});

Logger.log(`Server started at ${server.url}`);