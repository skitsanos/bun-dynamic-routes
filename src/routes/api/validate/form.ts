export const POST = async ({req}) =>
{
    const contentType = req.headers.get('content-type') ?? '';
    const invalid = 'Invalid!';

    if (!contentType.startsWith('application/x-www-form-urlencoded') && !contentType.startsWith('multipart/form-data'))
    {
        return new Response(invalid, {status: 400});
    }

    let data: FormData;
    try
    {
        data = await req.formData();
    }
    catch
    {
        return new Response(invalid, {status: 400});
    }

    const body = data.get('body');

    if (!body || typeof body !== 'string')
    {
        return new Response(invalid, {status: 400});
    }

    return Response.json({
        body
    });
};
