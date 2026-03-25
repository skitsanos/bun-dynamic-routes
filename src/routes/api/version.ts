import packageJson from '../../../package.json';

export const GET = () =>
{
    return Response.json({
        version: packageJson.version,
        bunVersion: Bun.version
    });
};
