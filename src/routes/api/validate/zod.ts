import {z} from 'zod';
import Logger from '../../../utils/logger.ts';

const logger = new Logger('ZodRoute');

const schema = z.object({
    email: z.string().min(1),
    number: z.coerce.string().optional()
});

export const POST = async ({req}) =>
{
    let data: FormData;
    try
    {
        data = await req.formData();
    }
    catch
    {
        logger.warn('Invalid form payload', {reason: 'formData parse failed'});
        return new Response('Invalid!', {status: 400});
    }

    const parsed = schema.safeParse(Object.fromEntries(data.entries()));

    if (!parsed.success)
    {
        logger.warn('Invalid!', {errors: parsed.error.flatten()});
        return new Response('Invalid!', {status: 400});
    }

    logger.trace(JSON.stringify(parsed.data));
    return Response.json({
        message: 'Created!'
    });
};
