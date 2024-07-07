import {plugin} from 'bun';
import merge from '@/utils/merge.ts';

const yamlPlugin = plugin({
    name: 'YAML',
    async setup(build)
    {
        const {
            parse,
            stringify
        } = await import('yaml');

        // when a .yaml file is imported...
        build.onLoad({filter: /\.(yaml|yml)$/}, async (args) =>
        {
            // read and parse the file
            const pathToConfig = args.path;

            const text = await Bun.file(pathToConfig).text();

            let config = parse(text) as Record<string, any>;

            const updateHandler = (updatedConfig: Partial<Record<string, any>>) =>
            {
                const newConfig = merge(config, updatedConfig);
                config = newConfig;

                Bun.write(pathToConfig, stringify(newConfig));
            };

            const exports = {
                config,
                update: updateHandler
            };

            // and returns it as a module
            return {
                exports,
                loader: 'object' // special loader for JS objects
            };
        });
    }
});

export default await yamlPlugin;