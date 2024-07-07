import {cwd} from 'process';
import {join} from 'path';
import merge from '@/utils/merge.ts';
import {parse, stringify} from 'yaml';

const loadConfig = async <T>(configPath: string) =>
{
    const pathToConfig = join(cwd(), configPath);

    if (!await Bun.file(pathToConfig).exists())
    {
        throw new Error(`Config file not found: ${configPath}`);
    }

    const text = await Bun.file(pathToConfig).text();

    let config = parse(text) as Record<string, any>;

    const updateHandler = (updatedConfig: Partial<Record<string, any>>) =>
    {
        const newConfig = merge(config, updatedConfig);
        config = newConfig;

        Bun.write(pathToConfig, stringify(newConfig));
    };

    return {
        config,
        update: updateHandler
    };
};

export default loadConfig;