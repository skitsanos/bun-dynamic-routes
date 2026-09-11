import {createHash} from 'node:crypto';
import {lstat, mkdir, mkdtemp, readdir, readFile, realpath, rename, rm, writeFile} from 'node:fs/promises';
import {basename, dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';

export const templateDirectories = ['src', 'public', 'config', 'tests', 'scripts', 'docs', 'skill', '.github'];
export const templateFiles = ['AGENTS.md', '.gitignore', '.dockerignore', 'biome.json', 'bun.lock', 'bunfig.toml',
    'Dockerfile', 'package.json', 'README.md', 'renovate.json', 'Taskfile.yaml', 'Taskfile.tests.yaml', 'tsconfig.json'];
const manifestName = '.source-manifest.json';
const sourceEntrypoint = 'SKILL.md.template';
type ExportFiles = Map<string, Uint8Array>;
interface Manifest
{
    format: 1;
    source: {repository: string; revision: string | null; dirty: boolean | null};
    files: Record<string, string>;
}
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const portable = (path: string) => path.split(sep).join('/');

async function walk(root: string, prefix = ''): Promise<string[]>
{
    const result: string[] = [];
    for (const name of (await readdir(join(root, prefix))).sort())
    {
        const path = join(prefix, name);
        const info = await lstat(join(root, path));
        if (info.isSymbolicLink()) throw new Error(`Export cannot contain symlinks: ${path}`);
        if (info.isDirectory()) result.push(...await walk(root, path));
        else if (info.isFile()) result.push(path);
        else throw new Error(`Export cannot contain special files: ${path}`);
    }
    return result;
}

export async function collectExport(root: string): Promise<ExportFiles>
{
    const result: ExportFiles = new Map();
    for (const file of templateFiles)
    {
        if (!(await lstat(join(root, file))).isFile()) throw new Error(`Expected a regular source file: ${file}`);
        result.set(`assets/${file}`, await readFile(join(root, file)));
    }
    for (const directory of templateDirectories)
    {
        if (!(await lstat(join(root, directory))).isDirectory()) throw new Error(`Expected a source directory: ${directory}`);
        for (const file of await walk(root, directory))
            result.set(`assets/${portable(file)}`, await readFile(join(root, file)));
    }
    // Keep reusable source in assets without registering another installed skill.
    // There is no assets/ inside the source skill; export is finite and deterministic.
    if (!(await lstat(join(root, 'skill', sourceEntrypoint))).isFile()) throw new Error('Missing skill source entrypoint');
    for (const file of await walk(join(root, 'skill')))
        result.set(file === sourceEntrypoint ? 'SKILL.md' : portable(file), await readFile(join(root, 'skill', file)));
    return result;
}

async function sourceMetadata(root: string): Promise<Manifest['source']>
{
    const git = (args: string[]) => Bun.spawn(['git', '-C', root, ...args], {stdout: 'pipe', stderr: 'ignore'});
    try
    {
        const revision = git(['rev-parse', 'HEAD']);
        const value = (await new Response(revision.stdout).text()).trim();
        if (await revision.exited !== 0) throw new Error('No Git revision');
        const status = git(['status', '--porcelain']);
        const changes = await new Response(status.stdout).text();
        return {repository: 'bun-dynamic-routes', revision: value, dirty: await status.exited === 0 ? changes.length > 0 : null};
    }
    catch { return {repository: 'bun-dynamic-routes', revision: null, dirty: null}; }
}

export async function checkExport(target: string, expected?: ExportFiles): Promise<void>
{
    const manifest = JSON.parse(await readFile(join(target, manifestName), 'utf8')) as Manifest;
    if (manifest.format !== 1 || !manifest.files || typeof manifest.files !== 'object') throw new Error('Invalid export manifest');
    const actual = (await walk(target)).map(portable).filter(path => path !== manifestName);
    const entrypoints = actual.filter(path => basename(path).toLowerCase() === 'skill.md');
    if (entrypoints.length !== 1 || entrypoints[0] !== 'SKILL.md')
        throw new Error('Export must contain exactly one SKILL.md at its root');
    const declared = Object.keys(manifest.files).sort();
    if (JSON.stringify(actual.sort()) !== JSON.stringify(declared)) throw new Error('Export has missing or unexpected files');
    for (const file of actual)
    {
        const bytes = await readFile(join(target, file));
        if (hash(bytes) !== manifest.files[file]) throw new Error(`Export was modified: ${file}`);
        if (expected && (!expected.has(file) || hash(bytes) !== hash(expected.get(file)!)))
            throw new Error(`Export differs from the canonical repository: ${file}`);
    }
    if (expected && JSON.stringify([...expected.keys()].sort()) !== JSON.stringify(declared))
        throw new Error('Export file set differs from the canonical repository');
}

function contains(parent: string, child: string): boolean
{
    const path = relative(parent, child);
    return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`));
}

export async function writeExport(root: string, destination: string): Promise<void>
{
    const source = await realpath(root);
    const target = resolve(destination);
    if (contains(source, target) || contains(target, source)) throw new Error('Export target must be separate from the source repository');
    await mkdir(dirname(target), {recursive: true});
    const canonicalTarget = join(await realpath(dirname(target)), basename(target));
    if (contains(source, canonicalTarget) || contains(canonicalTarget, source)) throw new Error('Export target overlaps the source repository');
    const info = await lstat(target).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return null;
        throw error;
    });
    if (info)
    {
        if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Export target must be a real directory');
        if ((await readdir(target)).length > 0)
        {
            const instructions = await readFile(join(target, 'SKILL.md'), 'utf8').catch(() => '');
            if (!/^name:\s*bun-server\s*$/m.test(instructions)) throw new Error('Refusing to replace an unrelated directory');
        }
    }
    const files = await collectExport(source);
    const staging = await mkdtemp(join(dirname(target), '.bun-server-export-'));
    const prepared = join(staging, 'prepared');
    const backup = join(staging, 'previous');
    await mkdir(prepared);
    let movedPrevious = false;
    let preserveStaging = false;
    try
    {
        for (const [path, bytes] of files)
        {
            await mkdir(dirname(join(prepared, path)), {recursive: true});
            await writeFile(join(prepared, path), bytes);
        }
        const manifest: Manifest = {format: 1, source: await sourceMetadata(source),
            files: Object.fromEntries([...files].map(([path, bytes]) => [path, hash(bytes)]).sort(([a], [b]) => a!.localeCompare(b!)))};
        await writeFile(join(prepared, manifestName), `${JSON.stringify(manifest, null, 2)}\n`);
        await checkExport(prepared, files);
        if (info) { await rename(target, backup); movedPrevious = true; }
        try { await rename(prepared, target); }
        catch (error)
        {
            if (movedPrevious)
            {
                try { await rename(backup, target); }
                catch (restoreError)
                {
                    preserveStaging = true;
                    throw new Error(`Export installation and rollback failed; previous skill is preserved at ${backup}`, {cause: restoreError});
                }
            }
            throw error;
        }
    }
    finally { if (!preserveStaging) await rm(staging, {recursive: true, force: true}); }
}
