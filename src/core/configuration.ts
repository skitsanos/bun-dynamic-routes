import loadConfig from '../utils/loadConfig.ts';

export interface CorsConfig
{
    enabled: boolean;
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    allowCredentials: boolean;
    maxAge: number;
}

export interface AppConfig
{
    serviceName: string;
    server: {
        port: number;
        cors?: CorsConfig;
        ssl?: {
            key: string;
            cert: string;
        };
    };
}

const defaults: AppConfig = {
    serviceName: 'bun-service',
    server: {
        port: 3000
    }
};

const loaded = await loadConfig<Partial<AppConfig>>('server.yaml');

const config: AppConfig = {
    ...defaults,
    ...loaded,
    server: {
        ...defaults.server,
        ...loaded?.server
    }
};

export default config;
