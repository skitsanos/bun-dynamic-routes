/**
 * This script generates the routes file at build time.
 * It scans the routes directory and generates the routes file with the necessary imports and exports.
 * This is useful for production builds where the routes are bundled at compile time.
 */
import { Glob } from 'bun';
import { createHash } from 'crypto';
import { basename, dirname, extname } from 'path';

const computeSHA256 = (input: string) => createHash('sha256').update(input).digest('hex');

const lines = [
    '// This file is generated at build time, please do not modify it manually',
    '// @author: skitsanos',
    'import type { Hono } from \'hono\';',
    '// @ts-ignore',
    'import type { UpgradeWebSocket } from \'hono/dist/types/helper/websocket\';'
];

const glob = new Glob('src/routes/**/*.ts');
const handlers: Record<string, any> = {};

const processFile = async (file: string) => {
    const urlPath = dirname(file.replace(/\\/g, '/'));
    const pathParsed = urlPath.replace(/\$/g, ':').replace(/^src\/routes/, '') || '/';
    const fileExtension = extname(file);
    const method = basename(file, fileExtension);
    const handlerName = `handler${computeSHA256(file)}`;

    lines.push(`import ${handlerName} from '@/${file.replace(/^src\//, '')}';`);

    handlers[handlerName] = {
        method,
        handlerName,
        url: pathParsed,
        handler: await import(file)
    };
};

// Process files sequentially to avoid potential issues with concurrent imports
for await (const file of glob.scan('.')) {
    await processFile(file);
}

const generateRouteCode = (
    { method, url, handler, handlerName }: { method: string; url: string; handler: any; handlerName: string }
): string => {
    if (method === 'ws') {
        return `  instance.app.on('GET', '${url}', instance.upgradeWebSocket(${handlerName}));`;
    }
    if (Array.isArray(handler.default)) {
        return `  instance.app.${method}('${url}', ...${handlerName});`;
    }
    return `  instance.app.${method}('${url}', ${handlerName});`;
};

lines.push(`
export interface HonoApp {
  app: Hono,
  upgradeWebSocket: UpgradeWebSocket
}

export const parseRoutesAtBuildTime = async (instance: HonoApp) => {
${Object.values(handlers).map(generateRouteCode).join('\n')}
};`);

await Bun.write('src/.routes/index.ts', lines.join('\n'));