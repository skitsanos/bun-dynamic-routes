import {join} from 'node:path';
import {connect, projectRoot, until} from '../tests/support.ts';

const image = `bun-routes-test:${process.pid}`;
const run = async (args: string[], inherit = false): Promise<string> =>
{
    const child = Bun.spawn(['docker', ...args], {
        cwd: projectRoot, stdout: inherit ? 'inherit' : 'pipe', stderr: inherit ? 'inherit' : 'pipe'
    });
    const [code, output, error] = await Promise.all([child.exited,
        inherit ? '' : new Response(child.stdout).text(), inherit ? '' : new Response(child.stderr).text()]);
    if (code !== 0) throw new Error(`docker ${args[0]} failed: ${output}${error}`);
    return output.trim();
};
let container = '';
try
{
    await run(['build', '--pull', '--tag', image, '.'], true);
    await run(['run', '--rm', '--entrypoint', 'bun', '-v', `${join(projectRoot, 'tests')}:/app/tests:ro`,
        image, 'test', 'tests/server.test.ts', 'tests/lifecycle.test.ts'], true);
    container = await run(['run', '-d', '--health-interval=1s', '--health-start-period=1s',
        '-e', 'PORT=43153', '-p', '127.0.0.1::43153', image]);
    const binding = await run(['port', container, '43153/tcp']);
    const url = `http://${binding}`;
    await until(async () =>
    {
        try { return (await fetch(`${url}/api/health`)).ok; } catch { return false; }
    }, 10000);
    await until(async () => await run(['inspect', '--format', '{{.State.Health.Status}}', container]) === 'healthy', 10000);
    const uid = await run(['exec', container, 'id', '-u']);
    if (uid === '0') throw new Error('Container runs as root');
    await run(['exec', container, 'sh', '-c', 'test ! -w /app/src/index.ts && test -w /app/uploads']);
    for (const path of ['/api/version', '/docs/readme', '/assets/css/style.css'])
        if (!(await fetch(url + path)).ok) throw new Error(`Container failed ${path}`);
    const form = new FormData();
    form.set('file', new File(['SYNTHETIC_DOCKER_TEST'], 'docker.txt'));
    const uploaded = await fetch(`${url}/api/upload`, {method: 'POST', body: form});
    if (!uploaded.ok) throw new Error('Container upload failed');
    const {fileName} = await uploaded.json();
    if (typeof fileName !== 'string' || !/^uploaded_[a-f0-9-]+_docker\.txt$/.test(fileName)) throw new Error('Unexpected upload name');
    if (await run(['exec', container, 'cat', `/app/uploads/${fileName}`]) !== 'SYNTHETIC_DOCKER_TEST')
        throw new Error('Container upload content mismatch');
    const client = await connect(`${url}/api/chat/ws`);
    try
    {
        await run(['stop', '--time', '8', container]);
        if (await client.closed !== 1012) throw new Error('Container did not gracefully close its WebSocket');
    }
    finally { client.socket.close(); }
    if (await run(['inspect', '--format', '{{.State.ExitCode}}', container]) !== '0') throw new Error('Container exit failed');
    console.log(`Docker passed: HTTP regressions, health, port override, UID ${uid}, uploads and WebSocket shutdown.`);
}
finally
{
    if (container) await run(['rm', '--force', container]);
    await run(['image', 'rm', image]);
}
