import {cp, mkdir, mkdtemp, rm, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

export const projectRoot = resolve(import.meta.dir, '..');
export const until = async <T>(check: () => T | Promise<T>, timeout = 3000): Promise<NonNullable<T>> =>
{
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline)
    {
        const value = await check();
        if (value) return value as NonNullable<T>;
        await Bun.sleep(20);
    }
    throw new Error('Timed out waiting for test condition');
};

const fixtures: Record<string, string> = {
    'contract/[id].ts': `export const GET=({params,query,pathname})=>Response.json({params,query,pathname},{headers:{Vary:'Accept-Encoding'}});`,
    'explicit.ts': `export const GET=()=>new Response('get'); export const HEAD=()=>new Response(null,{status:202,headers:{'X-Explicit':'head'}}); export const OPTIONS=()=>new Response('options',{headers:{'X-Explicit':'options'}});`,
    'fallback.ts': `export default ({req})=>new Response(req.method); export const GET=()=>new Response('explicit');`,
    'failure.ts': `export const GET=()=>{throw new Error('synthetic-private-failure');};`,
    'protected.ts': `export const GET=()=>new Response('Unauthorized',{status:401});
      export const websocket={
        async upgrade({req}) {if(req.headers.has('X-Throw'))throw new Error('synthetic-private-guard');return req.headers.get('Authorization')==='Bearer synthetic-test' ? {accept:true,context:{subject:'test-user'}} : {accept:false,response:new Response('Unauthorized',{status:401})};},
        open(ws){ws.send(JSON.stringify(ws.data.context));},
        async message(ws,message){if(message==='fail')throw new Error('synthetic-rejection');ws.send(message);}
      };`,
    'slow.ts': `let active=0;export const GET=async({query})=>{if(query.status)return Response.json({active});active++;try{await Bun.sleep(Number(query.delay??250));return new Response('completed');}finally{active--;}};`
};

export const createSandbox = async (withFixtures = true) =>
{
    const root = await mkdtemp(join(tmpdir(), 'bun routes test '));
    const app = join(root, 'app');
    await mkdir(app);
    for (const name of ['src', 'public', 'config', 'package.json', 'tsconfig.json', 'bunfig.toml'])
        await cp(join(projectRoot, name), join(app, name), {recursive: true});
    await symlink(join(projectRoot, 'node_modules'), join(app, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
    if (withFixtures)
        for (const [path, content] of Object.entries(fixtures)) await Bun.write(join(app, 'src/routes', path), content);
    const children: ReturnType<typeof Bun.spawn>[] = [];
    const launch = (environment: Record<string, string> = {}, hot = false) =>
    {
        const env = {...process.env};
        for (const key of ['PORT', 'HOST', 'LOG_LEVEL', 'SERVER_NAME', 'NODE_ENV', 'SHUTDOWN_GRACE_PERIOD_MS']) delete env[key];
        const command = hot ? [process.execPath, '--hot', 'src/index.ts']
            : process.env.TEST_BINARY ? [process.env.TEST_BINARY] : [process.execPath, 'src/index.ts'];
        const processHandle = Bun.spawn(command, {
            cwd: app, env: {...env, PORT: '0', HOST: '127.0.0.1', NODE_ENV: 'production', LOG_LEVEL: 'INFO', ...environment},
            stdout: 'pipe', stderr: 'pipe'
        });
        children.push(processHandle);
        let output = '';
        const capture = async (stream: ReadableStream<Uint8Array>) =>
        {
            for await (const chunk of stream) output += new TextDecoder().decode(chunk);
        };
        const captured = Promise.all([capture(processHandle.stdout), capture(processHandle.stderr)]);
        return {process: processHandle, output: () => output, captured};
    };
    const start = async (environment: Record<string, string> = {}, hot = false) =>
    {
        const child = launch(environment, hot);
        const url = await until(() =>
        {
            if (child.process.exitCode !== null) throw new Error(`Server exited: ${child.output()}`);
            return child.output().match(/Server started at (https?:\/\/\S+)/)?.[1];
        });
        return {...child, url};
    };
    const cleanup = async () =>
    {
        for (const child of children)
        {
            if (child.exitCode !== null) continue;
            child.kill('SIGTERM');
            await Promise.race([child.exited, Bun.sleep(1000)]);
            if (child.exitCode === null) child.kill('SIGKILL');
            await child.exited;
        }
        await rm(root, {recursive: true, force: true});
    };
    return {root, app, start, launch, cleanup};
};

export const connect = async (url: string, headers: Record<string, string> = {}) =>
{
    // lib.dom hides Bun's extended constructor overload; the runtime supports these options.
    const BunSocket = WebSocket as unknown as new (url: string, options: Bun.WebSocketOptions) => WebSocket;
    const socket = new BunSocket(url.replace(/^http/, 'ws'), {headers});
    const messages: string[] = [];
    socket.addEventListener('message', event => messages.push(String(event.data)));
    const closed = new Promise<number>(resolve => socket.addEventListener('close', event => resolve(event.code), {once: true}));
    await new Promise<void>((resolve, reject) =>
    {
        const timeout = setTimeout(() => { socket.close(); reject(new Error('WebSocket timed out')); }, 3000);
        socket.addEventListener('open', () => { clearTimeout(timeout); resolve(); }, {once: true});
        socket.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('WebSocket rejected')); }, {once: true});
    });
    return {socket, messages, closed};
};
