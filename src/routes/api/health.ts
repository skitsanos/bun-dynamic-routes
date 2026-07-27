import type {RouteHandler} from '../../core/types.ts';
import {isCompiled} from '../../utils/runtime.ts';
export const GET: RouteHandler = () =>
{
    return Response.json({
        status: 'ok',
        binary: isCompiled,
        uptime: process.uptime(),
        bun: Bun.version,
        pid: process.pid
    });
};
