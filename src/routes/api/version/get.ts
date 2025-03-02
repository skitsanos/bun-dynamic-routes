import response from '@/utils/response';
import {type Context} from 'hono';
import p from 'package.json';

export default async ({json}: Context) =>
    json(response.result({
        version: p.version,
        bunVersion: Bun.version
    }));