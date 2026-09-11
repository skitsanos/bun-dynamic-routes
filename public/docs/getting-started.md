# Getting Started

Keep Bun current with regular `bun upgrade`, then install and verify:

```sh
bun install --frozen-lockfile
bun run verify
bun run dev
```

Open `http://localhost:3000`. Try [chat](/chat) and [the architecture guide](/docs/architecture). No exact Bun release, packageManager field, or engines field is required.

## Add an HTTP route

Create `src/routes/api/example.ts`:

```ts
import type {RouteHandler} from '../../core/types.ts';

export const GET: RouteHandler = ({query}) =>
    Response.json({query});

export const POST: RouteHandler = async ({req}) => {
    const mediaType = req.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase();
    if (mediaType !== 'application/json') return new Response('JSON required', {status: 415});
    try {
        const body: unknown = await req.json();
        if (typeof body !== 'string') return new Response('String required', {status: 400});
        return Response.json({body});
    } catch {
        return new Response('Invalid JSON', {status: 400});
    }
};
```

A file becomes its URL; `[id]` directories capture parameters and `[...slug].ts` captures a suffix. No route-generation command is needed. Handlers receive a standard Request inside a context object. A repeated query key becomes an array; path params remain separate. Use relative imports in routes so compiled mode also works.

## Add a public WebSocket route

In `src/routes/api/echo-ws.ts`:

```ts
import type {RouteWebSocketHandler} from '../../core/types.ts';

export const websocket: RouteWebSocketHandler = {
    upgrade({req}) {
        const origin = req.headers.get('Origin');
        if (origin && origin !== new URL(req.url).origin)
            return {accept: false, response: new Response('Forbidden', {status: 403})};
        return {accept: true}; // This example is deliberately public.
    },
    message(socket, message) { socket.send(message); }
};
```

Authenticate private sockets in `upgrade` before returning accept. A GET authorization check does not protect an upgrade. The full chat example also validates names and message length.

## Verify and deploy

`bun run check` runs strict TypeScript, Biome and isolated tests. `bun run verify` also checks compiled execution. `bun run test:hurl` and `bun run test:docker` provide optional Hurl and Docker checks when those tools are installed. None requires a running local application or deletes existing uploads.

Run production source with `NODE_ENV=production bun run start`. To compile, use `bun run compile` and start `./dist/demo` from the project root. Keep source route modules, helpers, production dependencies, package.json, public assets, and optional YAML config on disk; the binary is not a self-contained distribution.
