import type {CorsConfig} from '../core/configuration.ts';

/**
 * Applies CORS headers to a response based on the request origin and config.
 * Returns a preflight response for OPTIONS requests, or null to continue.
 */
export const handleCors = (request: Request, cors?: CorsConfig): Response | null =>
{
    if (!cors?.enabled)
    {
        return null;
    }

    const origin = request.headers.get('origin');
    if (!origin)
    {
        return null;
    }

    const isAllowed = cors.allowedOrigins.includes('*') || cors.allowedOrigins.includes(origin);
    if (!isAllowed)
    {
        return null;
    }

    // Handle preflight
    if (request.method === 'OPTIONS')
    {
        return new Response(null, {
            status: 204,
            headers: corsHeaders(origin, cors)
        });
    }

    return null;
};

export const applyCorsHeaders = (response: Response, request: Request, cors?: CorsConfig): void =>
{
    if (!cors?.enabled)
    {
        return;
    }

    const origin = request.headers.get('origin');
    if (!origin)
    {
        return;
    }

    const isAllowed = cors.allowedOrigins.includes('*') || cors.allowedOrigins.includes(origin);
    if (!isAllowed)
    {
        return;
    }

    const headers = corsHeaders(origin, cors);
    for (const [key, value] of headers.entries())
    {
        // Vary is additive - a handler may already vary on something else.
        if (key.toLowerCase() === 'vary')
        {
            response.headers.append(key, value);
            continue;
        }

        response.headers.set(key, value);
    }
};

const corsHeaders = (origin: string, cors: CorsConfig): Headers =>
{
    const headers = new Headers();

    // Browsers reject `Allow-Origin: *` together with `Allow-Credentials: true`,
    // so reflect the concrete origin when credentials are in play.
    const isWildcard = cors.allowedOrigins.includes('*') && !cors.allowCredentials;

    headers.set('Access-Control-Allow-Origin', isWildcard ? '*' : origin);
    headers.set('Access-Control-Allow-Methods', cors.allowedMethods.join(', '));
    headers.set('Access-Control-Allow-Headers', cors.allowedHeaders.join(', '));

    // Whenever the response varies by request origin, caches must key on it too.
    if (!isWildcard)
    {
        headers.set('Vary', 'Origin');
    }

    if (cors.exposedHeaders.length > 0)
    {
        headers.set('Access-Control-Expose-Headers', cors.exposedHeaders.join(', '));
    }

    if (cors.allowCredentials)
    {
        headers.set('Access-Control-Allow-Credentials', 'true');
    }

    if (cors.maxAge > 0)
    {
        headers.set('Access-Control-Max-Age', String(cors.maxAge));
    }

    return headers;
};
