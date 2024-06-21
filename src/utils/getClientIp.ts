import type {Context} from 'hono';
import {getConnInfo} from 'hono/bun';

const getClientIp = (context: Context): string =>
{
    const {req} = context;

    // Check if there's a proxy in the chain
    const proxiedIpAddress = req.header('x-forwarded-for') ?? req.header('x-real-ip');

    if (proxiedIpAddress)
    {
        return proxiedIpAddress;
    }
    else
    {
        // If no proxy, the client's IP is in the remote address
        return getConnInfo(context).remote.address || '';
    }
};

export default getClientIp;
