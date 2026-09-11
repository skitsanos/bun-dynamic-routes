import {cp, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {checkExport} from './skill-export';

const skillRoot = resolve(process.argv[2] ?? join(import.meta.dir, '../..'));
await checkExport(skillRoot);
const temporary = await mkdtemp(join(tmpdir(), 'bun-skill-validation-'));
const project = join(temporary, 'project');
try
{
    await cp(join(skillRoot, 'assets'), project, {recursive: true});
    // Check the historical destructive-test regression at the caller's project level too.
    await mkdir(join(project, 'uploads'));
    const sentinels = ['uploads/existing-user-file.txt', 'random_file'];
    for (const path of sentinels) await writeFile(join(project, path), `preserve:${path}`);
    const run = async (args: string[]) => {
        const child = Bun.spawn([process.execPath, ...args], {cwd: project,
            env: {...process.env, TEST_BINARY: undefined}, stdout: 'inherit', stderr: 'inherit'});
        if (await child.exited !== 0) throw new Error(`Validation failed: bun ${args.join(' ')}`);
        for (const path of sentinels)
            if (await readFile(join(project, path), 'utf8') !== `preserve:${path}`) throw new Error(`Test runner changed caller data: ${path}`);
    };
    await run(['install', '--frozen-lockfile']);
    await run(['run', 'verify']);
    if (Bun.which('hurl')) await run(['run', 'test:hurl']);
    else console.log('Hurl is unavailable; optional Hurl checks skipped.');
    if (process.env.RUN_DOCKER_TESTS === '1') await run(['run', 'test:docker']);
    else console.log('Set RUN_DOCKER_TESTS=1 to include Docker image and container checks.');
    await checkExport(skillRoot);
    console.log('Exported template passed isolated validation; installed assets and caller data are intact.');
}
finally { await rm(temporary, {recursive: true, force: true}); }
