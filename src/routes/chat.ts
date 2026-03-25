import {join} from 'node:path';

const isCompiled = process.execPath !== Bun.which('bun');
const baseDir = isCompiled ? process.cwd() : new URL('../..', import.meta.url).pathname;

export const GET = () =>
{
    return new Response(Bun.file(join(baseDir, 'public', 'chat.html')));
};
