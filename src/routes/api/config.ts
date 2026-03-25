import config from '../../core/configuration.ts';

export const GET = () =>
{
    return Response.json(config);
};
