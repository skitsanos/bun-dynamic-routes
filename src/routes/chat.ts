import {join} from 'node:path';
import type {RouteHandler} from '../core/types.ts';
import {publicDir} from '../utils/runtime.ts';

export const GET: RouteHandler = () =>
{
    return new Response(Bun.file(join(publicDir, 'chat.html')), {
        headers: {'Content-Type': 'text/html'}
    });
};
