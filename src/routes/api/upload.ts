import {basename, join, resolve, sep} from 'node:path';
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
    const withoutLeadingDots = stripped.replace(/^\.+/, '');

    return withoutLeadingDots.length > 0 ? withoutLeadingDots.slice(0, 128) : 'file';
};

export const POST: RouteHandler = async ({req}) =>
{
    const startedAt = Bun.nanoseconds();
    logger.trace('Uploading file...');

    const data = await req.formData();
    const uploadedFile = data.get('file');

    if (!(uploadedFile instanceof File))
    {
        return Response.json({
            success: false,
            message: 'No file uploaded',
            time: (Bun.nanoseconds() - startedAt) / 1_000_000
        }, {status: 400});
    }

    const fileName = `uploaded_${Date.now()}_${safeFileName(uploadedFile.name)}`;
    const destination = join(uploadsDir, fileName);

    // Defence in depth - safeFileName should already make this unreachable.
    if (!resolve(destination).startsWith(`${uploadsDir}${sep}`))
    {
        logger.warn('Rejected upload with unsafe destination', {name: uploadedFile.name});

        return Response.json({
            success: false,
            message: 'Invalid file name'
        }, {status: 400});
    }

    try
    {
        await Bun.write(destination, uploadedFile);
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
