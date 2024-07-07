import type {Hono} from 'hono';
import handlerRoot from '@/routes/get.ts';

export const parseRoutesAtBuildTime = async (app: Hono) =>
{
    app.get('/', handlerRoot);
};