import {existsSync, readdirSync, statSync} from 'fs';
import {basename, dirname, isAbsolute, join as pathJoin, posix, resolve, sep as pathSeparator, extname} from 'path';
import Logger from './logger';

import {type Hono} from 'hono';
// @ts-ignore
import type {UpgradeWebSocket} from 'hono/dist/types/helper/websocket';

export interface HonoApp
{
    app: Hono,
    upgradeWebSocket: UpgradeWebSocket
}

const parsePath = async (instance: HonoApp, root: string, p: string) =>
{
    if (existsSync(p))
    {
        const fsItems = readdirSync(p);
        if (fsItems.length > 0)
        {
            for (const item of fsItems)
            {
                const fullPath = pathJoin(p, item);
                if (statSync(fullPath).isDirectory())
                {
                    await parsePath(instance, root, fullPath);
                }

                if (statSync(fullPath).isFile() && extname(fullPath) === '.ts')
                {
                    const urlPart = fullPath.substring(root.length);
                    const urlPath = dirname(urlPart.replace(/\\/gi, '/'));

                    const pathParsed = urlPath.replace(/\$/gi, ':');

                    const method = basename(fullPath).replace(/\.[^/.]+$/, '');

                    const routeModule = await import(fullPath);

                    if (method !== 'ws')
                    {
                        Logger.log(`Mounting ${method.toUpperCase()} ${pathParsed}`);
                        instance.app.on(method.toUpperCase(), pathParsed, routeModule.default);
                    }
                    else
                    {
                        Logger.log(`Mounting WebSocket at ${pathParsed}`);

                        instance.app.on('GET', pathParsed, instance.upgradeWebSocket(routeModule.default));
                    }
                }
            }
        }
    }
};

/**
 * Parse routes from a given path and load their handlers
 * @param instance {HonoApp}
 * @param path {string}
 */
const loadRoutes = async (instance: HonoApp, path: string) =>
{
    Logger.log(`Parsing routes at ${path}${pathSeparator}...`);

    const routesPath = pathJoin(import.meta.dir, '..', 'routes');
    Logger.log(`Resolved to ${routesPath}${pathSeparator}...`);

    //convert to the absolute path
    const absolutRoutesPath = isAbsolute(routesPath) ? routesPath : resolve(routesPath);

    const posixPath = absolutRoutesPath.split(pathSeparator).join(posix.sep);

    await parsePath(instance, posixPath, pathJoin(posixPath, '.'));

    Logger.log('Routes parsed.');
};

export default loadRoutes;