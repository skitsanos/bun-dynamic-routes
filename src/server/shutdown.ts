import type {RouteSocket, SocketData} from '../core/types.ts';
import Logger from '../utils/logger.ts';

const logger = new Logger('Core');
export const installShutdown = (server: Bun.Server<SocketData>, sockets: Set<RouteSocket>, graceMs: number): void =>
{
    let stopping = false;
    const shutdown = async (signal: string) =>
    {
        if (stopping) return;
        stopping = true;
        logger.info(`Received ${signal}, shutting down...`);
        const deadline = setTimeout(() =>
        {
            logger.warn('Shutdown grace period elapsed');
            void server.stop(true);
            process.exit(0);
        }, graceMs);
        try
        {
            const stopped = server.stop();
            for (const ws of sockets) ws.close(1012, 'Server restarting');
            await stopped;
            clearTimeout(deadline);
            logger.info('Server stopped');
            process.exit(0);
        }
        catch (error)
        {
            clearTimeout(deadline);
            logger.error('Shutdown failed', {error});
            process.exit(1);
        }
    };
    for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => void shutdown(signal));
};
