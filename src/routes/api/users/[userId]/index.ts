export const GET = ({params}) =>
{
    if (!params.userId)
    {
        return new Response('Not Found', {status: 404});
    }

    return Response.json({result: {user: params.userId}});
};
