import config from '../../core/configuration.ts';
import type {RouteHandler} from '../../core/types.ts';

/**
 * Exposes the effective configuration for demo purposes.
 *
 * Built from an explicit allowlist rather than serialising `config` wholesale, so
 * that adding a secret-bearing field (TLS key/cert paths, credentials) to the
 * schema cannot silently start publishing it here.
 */
export const GET: RouteHandler = () =>
{
    return Response.json({
        serviceName: config.serviceName,
        logLevel: config.logLevel,
        server: {
            port: config.server.port,
            maxRequestBodySize: config.server.maxRequestBodySize,
            trustProxy: config.server.trustProxy,
            cors: config.server.cors,
            ssl: {enabled: Boolean(config.server.ssl)}
        }
    });
};
