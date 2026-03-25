export const GET = () =>
{
    return Response.json({
        status: 'ok',
        binary: process.execPath !== Bun.which('bun'),
        uptime: process.uptime(),
        bun: Bun.version,
        pid: process.pid
    });
};
