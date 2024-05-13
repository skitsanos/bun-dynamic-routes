import {plugin} from 'bun';

await plugin({
    name: 'YAML',
    async setup(build)
    {
        const {parse} = await import('yaml');

        // when a .yaml file is imported...
        build.onLoad({filter: /\.(yaml|yml)$/}, async (args) =>
        {
            // read and parse the file
            const text = await Bun.file(args.path).text();
            const exports = parse(text) as Record<string, any>;

            // and returns it as a module
            return {
                exports,
                loader: 'object' // special loader for JS objects
            };
        });
    }
});