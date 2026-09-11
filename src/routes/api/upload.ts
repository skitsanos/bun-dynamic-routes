import {lstat, mkdir, open, unlink} from 'node:fs/promises';
import {basename, join, resolve} from 'node:path';
import type {RouteHandler} from '../../core/types.ts';
import Logger from '../../utils/logger.ts';

const logger = new Logger('Upload');

const uploadsDir = resolve(process.cwd(), 'uploads');

/**
 * Builds a filesystem-safe name from a client-supplied filename.
 *
 * `Bun.write` resolves relative to the CWD and creates intermediate directories,
 * so an unsanitized name such as `../../evil.txt` writes outside the project.
 * Strip any directory component, then allow only a conservative character set so
 * nothing can re-introduce a path separator.
 */
const safeFileName = (rawName: string): string =>
{
    const stripped = basename(rawName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const withoutLeadingDots = stripped.replace(/^\.+/, '').replace(/\.{2,}/g, '_');

    return withoutLeadingDots.length > 0 ? withoutLeadingDots.slice(0, 128) : 'file';
};

export const POST: RouteHandler = async ({req}) =>
{
    const startedAt = Bun.nanoseconds();
    logger.trace('Uploading file...');

    if (req.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase() !== 'multipart/form-data')
        return Response.json({success: false, message: 'Multipart form required'}, {status: 415});
    let data: FormData;
    try { data = await req.formData(); }
    catch { return Response.json({success: false, message: 'Invalid multipart form'}, {status: 400}); }
    const uploadedFile = data.get('file');

    if (!(uploadedFile instanceof File))
    {
        return Response.json({
            success: false,
            message: 'No file uploaded',
            time: (Bun.nanoseconds() - startedAt) / 1_000_000
        }, {status: 400});
    }

    const fileName = `uploaded_${crypto.randomUUID()}_${safeFileName(uploadedFile.name)}`;
    const destination = join(uploadsDir, fileName);

    try
    {
        await mkdir(uploadsDir, {recursive: true});
        const directory = await lstat(uploadsDir);
        if (!directory.isDirectory() || directory.isSymbolicLink()) throw new Error('Invalid uploads directory');
        // Exclusive creation also prevents replacing an existing file or symlink.
        const file = await open(destination, 'wx', 0o600);
        try { await file.writeFile(new Uint8Array(await uploadedFile.arrayBuffer())); }
        catch (error) { await unlink(destination); throw error; }
        finally { await file.close(); }
        logger.trace(`File uploaded: ${fileName}`);

        return Response.json({
            success: true,
            message: 'File uploaded successfully',
            fileName,
            time: (Bun.nanoseconds() - startedAt) / 1_000_000
        });
    }
    catch (error)
    {
        logger.error(`Error saving file ${fileName}`, {error});

        return Response.json({
            success: false,
            message: 'Error saving file'
        }, {status: 500});
    }
};
