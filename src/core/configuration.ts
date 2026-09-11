import {z} from 'zod';
import loadConfig from '../utils/loadConfig.ts';
import Logger from '../utils/logger.ts';

const headerValue = z.string().regex(/^[\x20-\x7e]+$/);
const headerToken = z.string().regex(/^[!#$%&'*+.^_`|~0-9a-zA-Z-]+$/);
const logLevel = z.enum(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']);
const corsSchema = z.object({
    enabled: z.boolean().default(false),
    allowedOrigins: z.array(headerValue).default([]),
    allowedMethods: z.array(z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']))
        .default(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
    allowedHeaders: z.array(headerToken).default(['Content-Type', 'Authorization']),
    exposedHeaders: z.array(headerToken).default([]),
    allowCredentials: z.boolean().default(false),
    maxAge: z.number().int().nonnegative().default(0)
}).refine(value => !(value.allowCredentials && value.allowedOrigins.includes('*')),
    'Credentialed CORS requires explicit origins');

export const appConfigSchema = z.object({
    serviceName: headerValue.default('bun-service'),
    logLevel: logLevel.default('INFO'),
    server: z.object({
        port: z.number().int().min(0).max(65535).default(3000),
        hostname: z.string().trim().min(1).default('127.0.0.1'),
        maxRequestBodySize: z.number().int().positive().default(50 * 1024 * 1024),
        shutdownGracePeriodMs: z.number().int().min(0).max(60000).default(5000),
        trustProxy: z.boolean().default(false),
        cors: corsSchema.optional(),
        ssl: z.object({key: z.string().min(1), cert: z.string().min(1)}).optional()
    }).prefault({})
});
const integer = z.string().regex(/^\d+$/).transform(Number);
const environmentSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
    PORT: integer.pipe(z.number().int().min(0).max(65535)).optional(),
    HOST: z.string().trim().min(1).optional(),
    LOG_LEVEL: z.string().transform(value => value.toUpperCase()).pipe(logLevel).optional(),
    SERVER_NAME: headerValue.optional(),
    SHUTDOWN_GRACE_PERIOD_MS: integer.pipe(z.number().int().min(0).max(60000)).optional()
});
export type CorsConfig = z.infer<typeof corsSchema>;
export type AppConfig = z.infer<typeof appConfigSchema>;

export const parseConfiguration = (raw: unknown, environment: Record<string, string | undefined>): AppConfig =>
{
    const env = environmentSchema.parse(environment);
    const config = appConfigSchema.parse(raw ?? {});
    const suppliedHost = raw && typeof raw === 'object' && 'server' in raw
        && raw.server && typeof raw.server === 'object' && 'hostname' in raw.server;
    config.server.port = env.PORT ?? config.server.port;
    config.server.hostname = env.HOST ?? (suppliedHost ? config.server.hostname
        : env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
    config.server.shutdownGracePeriodMs = env.SHUTDOWN_GRACE_PERIOD_MS ?? config.server.shutdownGracePeriodMs;
    config.logLevel = env.LOG_LEVEL ?? config.logLevel;
    config.serviceName = env.SERVER_NAME ?? config.serviceName;
    return config;
};
const logger = new Logger('Config');
let config: AppConfig;
try { config = parseConfiguration(await loadConfig<unknown>('server.yaml'), process.env); }
catch (error)
{
    logger.fatal('Invalid configuration', error instanceof z.ZodError
        ? {fields: error.issues.map(issue => issue.path.join('.'))} : {reason: 'Cannot read configuration'});
    process.exit(1);
}
export default config;
