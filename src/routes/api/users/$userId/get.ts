import response from '@/utils/response';
import {type Context} from 'hono';

export default async (ctx: Context) =>
{
    const {userId} = ctx.req.param();

    return ctx.json(response.result({
        user: userId
    }));
};
