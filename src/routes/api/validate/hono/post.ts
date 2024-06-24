import {validator} from 'hono/validator';

const handlerWithValidation = validator('form', (value, c) =>
{
    const body = value['body'];
    if (!body || typeof body !== 'string')
    {
        return c.text('Invalid!', 400);
    }
    return {
        body: body
    };
});

export default handlerWithValidation;