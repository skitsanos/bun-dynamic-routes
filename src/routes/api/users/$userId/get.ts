import response from '@/utils/response';
import {type Context} from 'hono';

export default async ({req, json}: Context) =>
{
    const {userId} = req.param();

    return json(response.result({
        user: userId
    }));
};
