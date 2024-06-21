import response from '@/utils/response';
import {type Context} from 'hono';

export default async ({json}: Context) =>
    json(response.result({
        info: 'Bun App Server'
    }));