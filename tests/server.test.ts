import {afterAll, beforeAll, expect, test} from 'bun:test';
import {mkdir, readdir, rename, symlink, unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {connect, createSandbox, until} from './support.ts';

let sandbox: Awaited<ReturnType<typeof createSandbox>>;
let server: Awaited<ReturnType<typeof sandbox.start>>;
const request = (path: string, options?: RequestInit) => fetch(new URL(path, server.url), {...options, redirect: 'manual'});
const allowed = 'https://allowed.test';
const upgradeHeaders = {Upgrade: 'websocket', Connection: 'Upgrade', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ=='};

beforeAll(async () =>
{
    sandbox = await createSandbox();
    await Bun.write(join(sandbox.app, 'config/server.yaml'), JSON.stringify({server: {cors: {
        enabled: true, allowedOrigins: [allowed], allowCredentials: true
    }}}));
    server = await sandbox.start();
});
afterAll(async () => { await sandbox?.cleanup(); });

for (const path of ['/', '/chat', '/docs/readme', '/api/health', '/api/version', '/api/users/u42', '/assets/css/style.css'])
{
    test(`GET and HEAD ${path}`, async () =>
    {
        const get = await request(path);
        expect(get.status).toBe(200);
        const bytes = (await get.arrayBuffer()).byteLength;
        const head = await request(path, {method: 'HEAD'});
        expect(head.status).toBe(200);
        expect(head.headers.get('content-type')).toBe(get.headers.get('content-type'));
        expect(await head.text()).toBe('');
        if (!path.startsWith('/api/health')) expect(Number(head.headers.get('content-length'))).toBe(bytes);
    });
}
test('runtime, version, redirect and redacted config', async () =>
{
    expect((await (await request('/api/health')).json()).binary).toBe(Boolean(process.env.TEST_BINARY));
    expect((await (await request('/api/version')).json()).bunVersion).toBe(Bun.version);
    const docs = await request('/docs');
    expect(docs.status).toBe(302);
    expect(docs.headers.get('location')).toBe('/docs/readme');
    const docsHead = await request('/docs', {method: 'HEAD'});
    expect(docsHead.status).toBe(302);
    expect(docsHead.headers.get('location')).toBe('/docs/readme');
    expect(await docsHead.text()).toBe('');
    const config = await (await request('/api/config')).json();
    expect(config.server.ssl).toEqual({enabled: false});
    const configHead = await request('/api/config', {method: 'HEAD'});
    expect(configHead.status).toBe(200);
    expect(await configHead.text()).toBe('');
});
test('explicit HEAD and ordinary OPTIONS win; default handlers serve truthful methods', async () =>
{
    const head = await request('/explicit', {method: 'HEAD'});
    expect(head.status).toBe(202);
    expect(head.headers.get('x-explicit')).toBe('head');
    const options = await request('/explicit', {method: 'OPTIONS', headers: {Origin: allowed}});
    expect(options.status).toBe(200);
    expect(await options.text()).toBe('options');
    expect(options.headers.get('x-explicit')).toBe('options');
    expect(await (await request('/fallback')).text()).toBe('explicit');
    expect(await (await request('/fallback', {method: 'PATCH'})).text()).toBe('PATCH');
    expect((await request('/api/health', {method: 'OPTIONS'})).headers.get('allow')).toBe('GET, HEAD, OPTIONS');
    const rejected = await request('/api/health', {method: 'POST'});
    expect(rejected.status).toBe(405);
    expect(rejected.headers.get('allow')).toBe('GET, HEAD, OPTIONS');
    expect((await request('/api/upload', {method: 'HEAD'})).status).toBe(405);
});
test('query arrays, hostile keys and path params remain distinct', async () =>
{
    const response = await request('/contract/path-value?id=query-value&name=Alice&name=Bob&__proto__=safe&constructor=value');
    const value = await response.json();
    expect(value.pathname).toBe('/contract/path-value');
    expect(value.params).toEqual({id: 'path-value'});
    expect(value.query).toEqual(JSON.parse('{"id":"query-value","name":["Alice","Bob"],"__proto__":"safe","constructor":"value"}'));
    expect(response.headers.get('vary')).toBe('Accept-Encoding, Origin');
});
test('unknown and malformed paths; generic errors', async () =>
{
    expect((await request('/missing')).status).toBe(404);
    expect((await request('/%ZZ')).status).toBe(400);
    const failed = await request('/failure');
    expect(failed.status).toBe(500);
    expect(await failed.text()).toBe('Internal Server Error');
});
test('CORS methods, requested headers, denied origins and unknown paths', async () =>
{
    const headers = {Origin: allowed, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'content-TYPE'};
    const response = await request('/api/health', {method: 'OPTIONS', headers});
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toBe('GET, HEAD, OPTIONS');
    expect(response.headers.get('access-control-allow-origin')).toBe(allowed);
    expect((await request('/missing', {method: 'OPTIONS', headers})).status).toBe(404);
    expect((await request('/api/health', {method: 'OPTIONS', headers: {...headers, 'Access-Control-Request-Method': 'DELETE'}})).status).toBe(405);
    expect((await request('/api/health', {method: 'OPTIONS', headers: {...headers, Origin: 'https://denied.test'}})).status).toBe(403);
    expect((await request('/api/health', {method: 'OPTIONS', headers: {...headers, 'Access-Control-Request-Headers': 'X-Unknown'}})).status).toBe(403);
});
test('all origin variants vary, including static assets and 304 responses', async () =>
{
    const first = await request('/assets/css/style.css');
    for (const origin of [undefined, allowed, 'https://denied.test'])
    {
        for (const conditional of [false, true])
        {
            const headers = new Headers();
            if (origin) headers.set('Origin', origin);
            if (conditional) headers.set('If-None-Match', first.headers.get('etag')!);
            const response = await request('/assets/css/style.css', {headers});
            expect(response.status).toBe(conditional ? 304 : 200);
            expect(response.headers.get('vary')).toBe('Origin');
            expect(response.headers.get('access-control-allow-origin')).toBe(origin === allowed ? allowed : null);
        }
    }
});
test('static validators, preconditions, ranges, method policy and MIME', async () =>
{
    const first = await request('/assets/css/style.css');
    const etag = first.headers.get('etag')!;
    const modified = first.headers.get('last-modified')!;
    const body = await first.text();
    for (const tag of [etag, etag.replace('W/', ''), '*', `"miss", ${etag}`])
        expect((await request('/assets/css/style.css', {headers: {'If-None-Match': tag}})).status).toBe(304);
    expect((await request('/assets/css/style.css', {headers: {'If-Modified-Since': modified}})).status).toBe(304);
    expect((await request('/assets/css/style.css', {headers: {'If-Match': '"miss"'}})).status).toBe(412);
    expect((await request('/assets/css/style.css', {headers: {'If-Match': '*'}})).status).toBe(200);
    expect((await request('/assets/css/style.css', {headers: {'If-Unmodified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT'}})).status).toBe(412);
    expect((await request('/assets/css/style.css', {headers: {'If-None-Match': '"miss"', 'If-Modified-Since': modified}})).status).toBe(200);
    const range = await request('/assets/css/style.css', {headers: {Range: 'bytes=0-9'}});
    expect(range.status).toBe(206);
    expect(await range.text()).toBe(body.slice(0, 10));
    expect(range.headers.get('content-range')).toBe(`bytes 0-9/${body.length}`);
    expect((await request('/assets/css/style.css', {method: 'POST'})).status).toBe(405);
    expect(first.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate');
});
test('static and Markdown symlinks cannot escape; directories and encoded traversal fail', async () =>
{
    const outside = join(sandbox.root, 'private.txt');
    await Bun.write(outside, 'SYNTHETIC PRIVATE FILE');
    const links = [join(sandbox.app, 'public/outside.txt'), join(sandbox.app, 'public/docs/outside.md')];
    for (const link of links) await symlink(outside, link);
    try
    {
        for (const path of ['/outside.txt', '/docs/outside', '/assets', '/assets/%2e%2e%2foutside.txt', '/assets/%00.txt'])
            expect((await request(path)).status).toBe(404);
    }
    finally { for (const link of links) await unlink(link); }
    const chat = join(sandbox.app, 'public/chat.html');
    await rename(chat, `${chat}.saved`);
    await symlink(outside, chat);
    try { expect((await request('/chat')).status).toBe(404); }
    finally { await unlink(chat); await rename(`${chat}.saved`, chat); }
});
test('malformed uploads are client errors and validators still accept valid forms', async () =>
{
    expect((await request('/api/upload', {method: 'POST', body: '{}', headers: {'Content-Type': 'application/json'}})).status).toBe(415);
    expect((await request('/api/upload', {method: 'POST', body: 'broken', headers: {'Content-Type': 'multipart/form-data; boundary=missing'}})).status).toBe(400);
    expect((await request('/api/upload', {method: 'POST', body: new FormData()})).status).toBe(400);
    for (const path of ['/api/validate/form', '/api/validate/zod']) expect((await request(path, {method: 'POST'})).status).toBe(400);
    expect((await request('/api/validate/form', {method: 'POST', body: new URLSearchParams({body: 'synthetic'})})).status).toBe(200);
    expect((await request('/api/validate/zod', {method: 'POST', body: new URLSearchParams({email: 'review@example.test'})})).status).toBe(200);
});
test('30 simultaneous uploads preserve every payload and existing user files', async () =>
{
    await mkdir(join(sandbox.app, 'uploads'), {recursive: true});
    const sentinel = join(sandbox.app, 'uploads/existing-user-file.txt');
    await Bun.write(sentinel, 'PRESERVE');
    const uploaded = await Promise.all(Array.from({length: 30}, async (_,index) =>
    {
        const body = new FormData();
        body.set('file', new File([`synthetic-${index}`], '../../same..name.txt'));
        const response = await request('/api/upload', {method: 'POST', body});
        expect(response.status).toBe(200);
        const value = await response.json();
        expect(value.fileName).not.toMatch(/[\\/]|\.\./);
        expect(await Bun.file(join(sandbox.app, 'uploads', value.fileName)).text()).toBe(`synthetic-${index}`);
        return value.fileName;
    }));
    expect(new Set(uploaded).size).toBe(30);
    expect(await Bun.file(sentinel).text()).toBe('PRESERVE');
    expect((await readdir(join(sandbox.app, 'uploads'))).length).toBe(31);
});
test('WebSocket guard blocks unauthorized and rejected promises before upgrade', async () =>
{
    expect((await request('/protected')).status).toBe(401);
    expect((await request('/protected', {headers: upgradeHeaders})).status).toBe(401);
    const failed = await request('/protected', {headers: {...upgradeHeaders, 'X-Throw': '1'}});
    expect(failed.status).toBe(500);
    expect(await failed.text()).toBe('Internal Server Error');
    expect((await request('/api/chat/ws', {headers: {...upgradeHeaders, Origin: 'https://denied.test'}})).status).toBe(403);
    expect((await request('/api/chat/ws?name=Alice&name=Bob', {headers: upgradeHeaders})).status).toBe(400);
    expect((await request('/api/chat/ws')).status).toBe(426);
    const head = await request('/api/chat/ws', {method: 'HEAD'});
    expect(head.status).toBe(405);
    expect(head.headers.get('allow')).toBe('GET, OPTIONS');
});
test('authenticated WebSocket context and async callback rejection', async () =>
{
    const client = await connect(new URL('/protected', server.url).href, {Authorization: 'Bearer synthetic-test'});
    try
    {
        await until(() => client.messages.length > 0);
        expect(JSON.parse(client.messages[0])).toEqual({subject: 'test-user'});
        client.socket.send('echo');
        await until(() => client.messages.includes('echo'));
        client.socket.send('fail');
        expect(await client.closed).toBe(1011);
        expect((await request('/api/health')).status).toBe(200);
    }
    finally { client.socket.close(); }
});
test('chat supports real pub/sub and rejects oversized messages', async () =>
{
    const one = await connect(new URL('/api/chat/ws?name=Alice', server.url).href, {Origin: new URL(server.url).origin});
    const two = await connect(new URL('/api/chat/ws?name=Bob', server.url).href);
    try
    {
        two.socket.send('synthetic-chat');
        await until(() => one.messages.some(value => JSON.parse(value).text === 'synthetic-chat'));
        two.socket.send('x'.repeat(501));
        expect(await two.closed).toBe(1009);
    }
    finally { one.socket.close(); two.socket.close(); }
});
