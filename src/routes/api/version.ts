import packageJson from '../../../package.json';
import type {RouteHandler} from '../../core/types.ts';

export const GET: RouteHandler = () =>
{
    return Response.json({
        version: packageJson.version,
        bunVersion: Bun.version
    });
};
