import {z} from 'zod';
import {validator} from 'hono/validator';
import type {Context} from 'hono';
import Logger from '@/utils/logger.ts';

const logger = new Logger('ZodRoute');

const schema = z.object({
    body: z.string()
});

const validatorHandler = validator('form', (value, c) =>
{
    const parsed = schema.safeParse(value);
    if (!parsed.success)
    {
        logger.warn('Invalid!', {value});
        return c.text('Invalid!', 401);
    }
    return parsed.data;
});

const contextHandler = (c: Context) =>
{
    const {body} = c.req.valid('form');
    // ... do something
    return c.json(
        {
            message: 'Created!'
        },
        201
    );
};

export default [validatorHandler, contextHandler];