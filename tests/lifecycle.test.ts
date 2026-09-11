import {expect, test} from 'bun:test';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {connect, createSandbox, until} from './support.ts';

test('SIGTERM completes HTTP, closes sockets with 1012 and exits successfully', async () =>
{
    const sandbox = await createSandbox();
    try
    {
        const server = await sandbox.start({SHUTDOWN_GRACE_PERIOD_MS: '1000'});
        const client = await connect(new URL('/api/chat/ws', server.url).href);
        const inflight = fetch(new URL('/slow?delay=250', server.url)).then(response => response.text());
        await until(async () => (await (await fetch(new URL('/slow?status=1', server.url))).json()).active > 0);
        server.process.kill('SIGTERM');
        expect(await inflight).toBe('completed');
        expect(await client.closed).toBe(1012);
        expect(await server.process.exited).toBe(0);
    }
    finally { await sandbox.cleanup(); }
});
test('shutdown deadline aborts an overlong request', async () =>
{
    const sandbox = await createSandbox();
    try
    {
        const server = await sandbox.start({SHUTDOWN_GRACE_PERIOD_MS: '100'});
        const inflight = fetch(new URL('/slow?delay=5000', server.url)).then(() => 'completed', () => 'aborted');
        await until(async () => (await (await fetch(new URL('/slow?status=1', server.url))).json()).active > 0);
        const started = Date.now();
        server.process.kill('SIGTERM');
        expect(await server.process.exited).toBe(0);
        expect(Date.now() - started).toBeLessThan(1500);
        expect(await inflight).toBe('aborted');
        await server.captured;
        expect(server.output()).toContain('Shutdown grace period elapsed');
    }
    finally { await sandbox.cleanup(); }
});
test('missing WebSocket guard fails startup', async () =>
{
    const sandbox = await createSandbox();
    try
    {
        await Bun.write(join(sandbox.app, 'src/routes/unguarded.ts'), 'export const websocket={message(){}};');
        const server = sandbox.launch();
        expect(await server.process.exited).toBe(1);
        await server.captured;
        expect(server.output()).toContain('requires upgrade and message');
    }
    finally { await sandbox.cleanup(); }
});
for (const [key, value] of [['PORT', '3000junk'], ['PORT', '65536'], ['NODE_ENV', 'prod'], ['LOG_LEVEL', 'wrong']])
{
    test(`invalid environment ${key} fails before binding`, async () =>
    {
        const sandbox = await createSandbox(false);
        try
        {
            const server = sandbox.launch({[key]: value});
            expect(await server.process.exited).toBe(1);
            await server.captured;
            expect(server.output()).toContain('Invalid configuration');
            expect(server.output()).not.toContain('Server started');
        }
        finally { await sandbox.cleanup(); }
    });
}
test('configured body limit rejects oversized requests', async () =>
{
    const sandbox = await createSandbox(false);
    try
    {
        await Bun.write(join(sandbox.app, 'config/server.yaml'), 'server:\n  maxRequestBodySize: 128\n');
        const server = await sandbox.start();
        const response = await fetch(new URL('/api/upload', server.url), {method: 'POST', body: 'x'.repeat(1024)});
        expect(response.status).toBe(413);
    }
    finally { await sandbox.cleanup(); }
});

if (!process.env.TEST_BINARY)
{
    test('hot mode reloads edited routes and discovers new route files', async () =>
    {
        const sandbox = await createSandbox(false);
        try
        {
            const route = join(sandbox.app, 'src/routes/hot-check.ts');
            await Bun.write(route, 'export const GET=()=>new Response("before");');
            const server = await sandbox.start({NODE_ENV: 'development'}, true);
            const request = (path: string) => fetch(new URL(path, server.url));
            expect(await (await request('/hot-check')).text()).toBe('before');
            await Bun.write(route, 'export const GET=()=>new Response("after");');
            await until(async () => (await (await request('/hot-check')).text()) === 'after');
            expect((await request('/new-check')).status).toBe(404);
            await Bun.write(join(sandbox.app, 'src/routes/new-check.ts'), 'export const GET=()=>new Response("discovered");');
            await until(async () => (await (await request('/new-check')).text()) === 'discovered');
            expect((await request('/api/health')).status).toBe(200);
        }
        finally { await sandbox.cleanup(); }
    });
}

test.skipIf(!Bun.which('openssl'))('TLS serves requests without exposing certificate or key material', async () =>
{
    const sandbox = await createSandbox(false);
    try
    {
        const keyPath = join(sandbox.root, 'synthetic-key.pem');
        const certPath = join(sandbox.root, 'synthetic-cert.pem');
        const certificate = Bun.spawn(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
            '-subj', '/CN=localhost', '-keyout', keyPath, '-out', certPath], {stdout: 'ignore', stderr: 'ignore'});
        expect(await certificate.exited).toBe(0);
        await Bun.write(join(sandbox.app, 'config/server.yaml'), JSON.stringify({server: {
            ssl: {key: await readFile(keyPath, 'utf8'), cert: await readFile(certPath, 'utf8')}
        }}));
        const server = await sandbox.start();
        expect(server.url).toStartWith('https:');
        // Trust is disabled only for this temporary, self-signed test certificate.
        const response = await fetch(new URL('/api/config', server.url), {tls: {rejectUnauthorized: false}});
        expect(response.status).toBe(200);
        const data = await response.text();
        expect(data).not.toContain('PRIVATE KEY');
        expect(data).not.toContain('CERTIFICATE');
        expect(JSON.parse(data).server.ssl).toEqual({enabled: true});
    }
    finally { await sandbox.cleanup(); }
});
