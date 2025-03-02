import {cwd} from 'process';
import {join} from 'path';
import merge from '@/utils/merge.ts';
import {parse, stringify} from 'yaml';

/**
 * Loads and manages a configuration file
 * @param configPath Relative path to the configuration file from current working directory
 * @returns Object containing the config and update function
 */
const loadConfig = async <T extends Record<string, any>>(configPath: string) =>
{
    // Ensure the config path has the correct extension
    const normalizedPath = configPath.endsWith('.yaml') || configPath.endsWith('.yml')
                           ? configPath
                           : `${configPath}.yaml`;

    const pathToConfig = join(cwd(), 'config', normalizedPath);
    const configFile = Bun.file(pathToConfig);

    if (!await configFile.exists())
    {
        throw new Error(`Config file not found: ${normalizedPath}`);
    }

    try
    {
        const text = await configFile.text();
        let config = parse(text) as T;

        const updateHandler = async (updatedConfig: Partial<T>): Promise<void> =>
        {
            try
            {
                const newConfig = merge(config, updatedConfig) as T;
                config = newConfig;

                await Bun.write(pathToConfig, stringify(newConfig));
            }
            catch (error: any)
            {
                throw new Error(`Failed to update config file: ${error.message}`);
            }
        };

        return {
            config,
            update: updateHandler
        };
    }
    catch (error: any)
    {
        throw new Error(`Failed to parse config file ${normalizedPath}: ${error.message}`);
    }
};

export default loadConfig;