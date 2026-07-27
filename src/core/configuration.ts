import {z} from 'zod';
import loadConfig from '../utils/loadConfig.ts';
import Logger from '../utils/logger.ts';

const logger = new Logger('Config');

const corsSchema = z.object({
    enabled: z.boolean().default(false),
    allowedOrigins: z.array(z.string()).default([]),
    allowedMethods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
    allowedHeaders: z.array(z.string()).default(['Content-Type', 'Authorization']),
    exposedHeaders: z.array(z.string()).default([]),
    allowCredentials: z.boolean().default(false),
    maxAge: z.number().int().nonnegative().default(0)
});

const sslSchema = z.object({
    key: z.string().min(1),
    cert: z.string().min(1)
});

// `prefault` rather than `default`: a plain `.default({})` short-circuits parsing,
// so an omitted `server:` block would leave `port` undefined instead of 3000.
const appConfigSchema = z.object({
    serviceName: z.string().min(1).default('bun-service'),
    logLevel: z.enum(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']).default('INFO'),
    server: z.object({
        port: z.number().int().min(0).max(65535).default(3000),
        // 50MB
        maxRequestBodySize: z.number().int().positive().default(50 * 1024 * 1024),
        // `x-forwarded-for` is trivially spoofable, so only believe it when the
        // deployment actually sits behind a proxy that rewrites it.
        trustProxy: z.boolean().default(false),
        cors: corsSchema.optional(),
        ssl: sslSchema.optional()
    }).prefault({})
});

export type CorsConfig = z.infer<typeof corsSchema>;
export type AppConfig = z.infer<typeof appConfigSchema>;

const loaded = await loadConfig<unknown>('server.yaml');
const parsed = appConfigSchema.safeParse(loaded ?? {});

if (!parsed.success)
{
    logger.fatal('Invalid configuration in config/server.yaml', z.treeifyError(parsed.error));
    process.exit(1);
}

const config: AppConfig = parsed.data;

export default config;
