import {containedFile, decodeFilePath} from './files.ts';

export const findStaticFile = async (pathname: string, publicDir: string): Promise<string | null> =>
{
    const name = decodeFilePath(pathname);
    return name ? containedFile(publicDir, name) : null;
};
const weakTag = (tag: string) => tag.replace(/^W\//, '');
const dateValue = (value: string | null) => value === null ? NaN : Date.parse(value);

/** Bun retains responsibility for HEAD and byte-range file responses. */
export const serveStatic = (request: Request, path: string): Response =>
{
    const file = Bun.file(path);
    const etag = `W/"${file.size.toString(16)}-${Math.floor(file.lastModified).toString(16)}"`;
    const modified = Math.floor(file.lastModified / 1000) * 1000;
    const headers = {
        'Content-Type': file.type,
        'Cache-Control': 'public, max-age=0, must-revalidate',
        ETag: etag,
        'Last-Modified': new Date(modified).toUTCString()
    };
    const ifMatch = request.headers.get('if-match');
    // A weak ETag cannot satisfy a strong If-Match comparison.
    if (ifMatch !== null && ifMatch.trim() !== '*') return new Response(null, {status: 412, headers});
    if (ifMatch === null && modified > dateValue(request.headers.get('if-unmodified-since')))
        return new Response(null, {status: 412, headers});
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch !== null && (ifNoneMatch.trim() === '*'
        || ifNoneMatch.split(',').some(tag => weakTag(tag.trim()) === weakTag(etag))))
        return new Response(null, {status: 304, headers});
    if (ifNoneMatch === null && modified <= dateValue(request.headers.get('if-modified-since')))
        return new Response(null, {status: 304, headers});
    return new Response(file, {headers});
};
