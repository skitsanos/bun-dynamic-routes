import {Glob} from 'bun';
import {createHash} from 'crypto';
import {basename, dirname, extname} from 'path';

function computeSHA256(input: string)
{
    return createHash('sha256').update(input).digest('hex');
}

const lines = [
    'import type {Hono} from \'hono\';',
    '// @ts-ignore',
    'import type {UpgradeWebSocket} from \'hono/dist/types/helper/websocket\';'
];

const glob = new Glob('src/routes/**/*.ts');

const handlers: Record<string, any> = {};

for await (const file of glob.scan('.'))
{
    const urlPath = dirname(file.replace(/\\/gi, '/'));

    const pathParsed = urlPath
        .replace(/\$/gi, ':')
        .replace(/^src\/routes/, '')||'/';

    const fileExtension = extname(file);
    const method = basename(file, fileExtension);
    const handlerName = `handler${computeSHA256(file)}`;

    lines.push(`import ${handlerName} from '@/${file.replace(/^src\//, '')}';`);

    handlers[handlerName] = {
        method,
        handlerName,
        url: `${pathParsed}`,
        handler: await import(file)
    };
}

lines.push('\nexport interface HonoApp');
lines.push('{');
lines.push('  app: Hono,');
lines.push('  upgradeWebSocket: UpgradeWebSocket');
lines.push('}');

lines.push('\n');
lines.push('export const parseRoutesAtBuildTime = async (instance: HonoApp) =>');
lines.push('{');

for (const routes in handlers)
{
    const {
        method,
        url,
        handler,
        handlerName
    } = handlers[routes];

    if (method === 'ws')
    {
        lines.push(`  instance.app.on('GET', \'${url}\', instance.upgradeWebSocket(${handlerName}));`);
    }
    else
    {
        if (Array.isArray(handler.default))
        {
            lines.push(`  instance.app.${method}('${url}', ...${handlerName});`);
        }
        else
        {
            lines.push(`  instance.app.${method}('${url}', ${handlerName});`);
        }
    }
}

lines.push('};');

const routesFile = Bun.file('src/.routes/index.ts');
Bun.write(routesFile, lines.join('\n'));
