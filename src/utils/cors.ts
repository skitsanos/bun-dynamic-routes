import type {CorsConfig} from '../core/configuration.ts';
import type {RouteMethod} from '../core/types.ts';

const allowedOrigin = (origin: string, cors: CorsConfig) =>
    cors.allowedOrigins.includes('*') || cors.allowedOrigins.includes(origin);

export const applyCorsHeaders = (response: Response, request: Request, cors?: CorsConfig): void =>
{
    if (!cors?.enabled) return;
    const wildcard = cors.allowedOrigins.includes('*') && !cors.allowCredentials;
    if (!wildcard)
    {
        const vary = response.headers.get('Vary')?.split(',').map(value => value.trim().toLowerCase()) ?? [];
        if (!vary.includes('*') && !vary.includes('origin')) response.headers.append('Vary', 'Origin');
    }
    const origin = request.headers.get('Origin');
    if (wildcard) response.headers.set('Access-Control-Allow-Origin', '*');
    else if (origin && allowedOrigin(origin, cors)) response.headers.set('Access-Control-Allow-Origin', origin);
    else return;
    if (cors.allowCredentials) response.headers.set('Access-Control-Allow-Credentials', 'true');
    if (cors.exposedHeaders.length) response.headers.set('Access-Control-Expose-Headers', cors.exposedHeaders.join(', '));
};

/** Resolve the path first; ordinary OPTIONS remains a route operation. */
export const handleCors = (request: Request, methods: RouteMethod[], cors?: CorsConfig): Response | null =>
{
    const origin = request.headers.get('Origin');
    const requestedMethod = request.headers.get('Access-Control-Request-Method');
    if (!cors?.enabled || request.method !== 'OPTIONS' || !origin || !requestedMethod) return null;
    if (!allowedOrigin(origin, cors)) return new Response('Forbidden', {status: 403});
    const allowed = methods.filter(method => cors.allowedMethods.includes(method));
    if (!allowed.includes(requestedMethod as RouteMethod))
        return new Response('Method Not Allowed', {status: 405, headers: {Allow: methods.join(', ')}});
    const requestedHeaders = request.headers.get('Access-Control-Request-Headers')?.split(',')
        .map(header => header.trim().toLowerCase()) ?? [];
    const allowedHeaders = cors.allowedHeaders.map(header => header.toLowerCase());
    if (requestedHeaders.some(header => !allowedHeaders.includes(header)))
        return new Response('Forbidden', {status: 403});
    return new Response(null, {status: 204, headers: {
        'Access-Control-Allow-Methods': allowed.join(', '),
        'Access-Control-Allow-Headers': cors.allowedHeaders.join(', '),
        'Access-Control-Max-Age': String(cors.maxAge)
    }});
};
