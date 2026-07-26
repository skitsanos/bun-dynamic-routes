import type {RouteHandler} from '../../../../core/types.ts';
export const GET: RouteHandler = ({params}) =>
{
    if (!params.userId)
    {
        return new Response('Not Found', {status: 404});
    }

    return Response.json({result: {user: params.userId}});
};
