import Logger from '../../utils/logger.ts';

const logger = new Logger('Upload');

export const POST = async ({req}) =>
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

    const fileName = `uploaded_${Date.now()}_${uploadedFile.name}`;

    try
    {
        await Bun.write(fileName, await uploadedFile.arrayBuffer());
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
