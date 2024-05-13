import response from '@/utils/response';
import {type Context} from 'hono';

export default async (ctx: Context) =>
    ctx.json(response.result({
        info: 'Bun App Server'
    }));