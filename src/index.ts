import config from '@/core/configuration.ts';
import {createServer} from '@/server/createServer.ts';
import {installShutdown} from '@/server/shutdown.ts';
import Logger, {LogLevel, setDefaultLogLevel} from '@/utils/logger.ts';

setDefaultLogLevel(LogLevel[config.logLevel]);
const logger = new Logger('Core');
try
{
    const {server, sockets} = await createServer(config);
    installShutdown(server, sockets, config.server.shutdownGracePeriodMs);
    logger.info(`Server started at ${server.url}`, {url: server.url});
}
catch (error)
{
    logger.fatal('Server startup failed', {error});
    process.exit(1);
}
