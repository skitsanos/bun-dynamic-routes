import response from '@/utils/response';
import {type Context} from 'hono';

export default async ({json}: Context) =>
    json(response.result({
        version: '1.0.0',
        bunVersion: Bun.version
    }));