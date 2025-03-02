import loadConfig from '@/utils/loadConfig.ts';

export interface AppServerConfiguration {
    serviceName: string,
    server: {
        ssl?: {
            key: string;
            cert: string;
        };
        port: number;
        host: string;
        auth?: {
            jwtExpiration: number;
            jwtSecret: string;
            username: string;
            password: string;
            recoveryToken: string;
        };
    };

    logs: {
        days: number;
        size: number;
    };

    path?: {
        logs: string;
        certs?: string;
    };

    storage: {
        kind: string;
        options?: Record<string, any>;
    };
}

// Default configuration values
const DEFAULT_CONFIG: Partial<AppServerConfiguration> = {
    logs: {
        days: 7,
        size: 5 * 1024 * 1024 // 5MB
    }
};

export class Configuration {
    private static instance: Configuration | null = null;
    private _config!: AppServerConfiguration;
    private _update!: (config: Partial<AppServerConfiguration>) => Promise<void>;
    private readonly configPath = 'server';

    private constructor() {
        // Private constructor to prevent instantiation from outside
    }

    public static async getInstance(): Promise<Configuration> {
        if (!Configuration.instance) {
            Configuration.instance = new Configuration();
            await Configuration.instance.initialize();
        }
        return Configuration.instance;
    }

    private async initialize(): Promise<void> {
        try {
            const { config, update } = await loadConfig<AppServerConfiguration>(this.configPath);

            // Apply default values for missing properties
            this._config = this.applyDefaults(config);
            this._update = update;
        } catch (error) {
            throw new Error(`Failed to initialize configuration: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private applyDefaults(config: AppServerConfiguration): AppServerConfiguration {
        const result = { ...config };

        // Ensure logs configuration exists with defaults for missing properties
        result.logs = {
            days: config.logs?.days ?? DEFAULT_CONFIG.logs!.days,
            size: config.logs?.size ?? DEFAULT_CONFIG.logs!.size
        };

        return result;
    }

    public get config(): AppServerConfiguration {
        return this._config;
    }

    public async update(config: Partial<AppServerConfiguration>): Promise<void> {
        try {
            await this._update(config);

            // Reload configuration after update
            const { config: updatedConfig } = await loadConfig<AppServerConfiguration>(this.configPath);
            this._config = this.applyDefaults(updatedConfig);
        } catch (error) {
            throw new Error(`Failed to update configuration: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}