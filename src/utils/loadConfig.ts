import {join} from 'node:path';
import {YAML} from 'bun';

const loadConfig = async <T>(filename: string): Promise<T | null> =>
{
    const filePath = join(process.cwd(), 'config', filename);
    const file = Bun.file(filePath);

    if (!await file.exists())
    {
        return null;
    }

    const raw = await file.text();
    return YAML.parse(raw) as T;
};

export default loadConfig;
