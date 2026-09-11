import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const root = resolve(import.meta.dir, '..');
const temporary = await mkdtemp(join(tmpdir(), 'bun-compiled-test-'));
const binary = join(temporary, process.platform === 'win32' ? 'demo.exe' : 'demo');
try
{
    const build = Bun.spawn([process.execPath, 'build', '--compile', '--production', 'src/index.ts', '--outfile', binary], {
        cwd: root, stdout: 'inherit', stderr: 'inherit'
    });
    if (await build.exited !== 0) throw new Error('Compiled build failed');
    const tests = Bun.spawn([process.execPath, 'test', 'tests'], {
        cwd: root, env: {...process.env, TEST_BINARY: binary}, stdout: 'inherit', stderr: 'inherit'
    });
    if (await tests.exited !== 0) throw new Error('Compiled regression tests failed');
}
finally { await rm(temporary, {recursive: true, force: true}); }
