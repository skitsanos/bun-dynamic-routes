import type {RouteHandler} from '../core/types.ts';
import {containedFile} from '../utils/files.ts';
import {publicDir} from '../utils/runtime.ts';

export const GET: RouteHandler = async () =>
{
    const path = await containedFile(publicDir, 'chat.html');
    if (!path) return new Response('Not Found', {status: 404});
    return new Response(Bun.file(path), {
        headers: {'Content-Type': 'text/html'}
    });
};
