import {extname, join, sep} from 'node:path';

const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.txt': 'text/plain',
    '.xml': 'text/xml',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav'
};

/**
 * Serves static files from the given directory.
 * Returns a Response if the file exists, or null to pass through to routing.
 */
export const serveStatic = async (
    pathname: string,
    publicDir: string,
    ifNoneMatch?: string | null
): Promise<Response | null> =>
{
    // URL pathnames arrive percent-encoded, so decode before touching the filesystem -
    // otherwise a file such as `my style.css` is unreachable via `/my%20style.css`.
    let decodedPath: string;
    try
    {
        decodedPath = decodeURIComponent(pathname);
    }
    catch
    {
        // Malformed percent-encoding
        return null;
    }

    // Block path traversal. Checked after decoding so `%2e%2e` cannot slip through.
    if (decodedPath.includes('..') || decodedPath.includes('\0'))
    {
        return null;
    }

    const filePath = join(publicDir, decodedPath);

    // Ensure resolved path stays within public dir. The separator matters: a bare
    // prefix check would also accept a sibling such as `<publicDir>-private`.
    if (filePath !== publicDir && !filePath.startsWith(`${publicDir}${sep}`))
    {
        return null;
    }

    const file = Bun.file(filePath);
    if (!await file.exists())
    {
        return null;
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

    // HTML is the entrypoint that references fingerprinted assets, so it must be
    // revalidated rather than held for an hour.
    const cacheControl = ext === '.html'
        ? 'public, max-age=0, must-revalidate'
        : 'public, max-age=3600';

    // Weak validator derived from size + mtime - enough for conditional requests
    // without reading the file to hash it.
    const etag = `W/"${file.size.toString(16)}-${Math.floor(file.lastModified).toString(16)}"`;
    const headers: HeadersInit = {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        ETag: etag,
        'Last-Modified': new Date(file.lastModified).toUTCString()
    };

    if (ifNoneMatch?.split(',').some((candidate) => candidate.trim() === etag))
    {
        return new Response(null, {status: 304, headers});
    }

    return new Response(file, {headers});
};
