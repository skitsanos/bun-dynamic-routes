import type {Context} from 'hono';
import {Readable} from 'node:stream';
import {createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import Logger from '@/utils/logger.ts';

const logger = new Logger('Upload');

export default async ({
                          req,
                          json
                      }: Context) =>
{
    const startedAt = Bun.nanoseconds();
    logger.trace('Uploading file...');

    const data = await req.formData();
    const uploadedFile = data.get('file') as File;

    if (!uploadedFile)
    {
        return json({
            success: false,
            message: 'No file uploaded',
            time: (Bun.nanoseconds() - startedAt) / 1_000_000
        }, 400);
    }

    const fileName = `uploaded_${Date.now()}_${uploadedFile.name}`;
    const writeStream = createWriteStream(fileName);

    try
    {
        const readableStream = uploadedFile.stream();
        const readable = Readable.fromWeb(readableStream as any);

        await pipeline(readable, writeStream);

        logger.trace(`File uploaded: ${fileName}`);
        logger.trace(`Time taken: ${(Bun.nanoseconds() - startedAt) / 1_000_000}ms`);

        return json({
            success: true,
            message: 'File uploaded successfully',
            fileName: fileName,
            time: (Bun.nanoseconds() - startedAt) / 1_000_000
        });
    }
    catch (error)
    {
        console.error('Error streaming file to disk:', error);
        return json({
            success: false,
            message: 'Error saving file'
        }, 500);
    }
}