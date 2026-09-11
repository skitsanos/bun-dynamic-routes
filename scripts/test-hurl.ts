import {join} from 'node:path';
import {createSandbox, projectRoot} from '../tests/support.ts';

if (!Bun.which('hurl')) throw new Error('Install Hurl: https://hurl.dev/docs/installation.html');
const sandbox = await createSandbox(false);
try
{
    await Bun.write(join(sandbox.root, 'random_file'), new Uint8Array(8 * 1024 * 1024));
    const server = await sandbox.start();
    const hurl = Bun.spawn(['hurl', '--test', '--variable', `base_url=${new URL(server.url).origin}`,
        '--file-root', sandbox.root, join(projectRoot, 'tests/smoke.hurl')], {stdout: 'inherit', stderr: 'inherit'});
    if (await hurl.exited !== 0) throw new Error('Hurl smoke checks failed');
}
finally { await sandbox.cleanup(); }
