# Getting Started

## Installation

```bash
bun install
```

## Development

```bash
bun run dev
```

The server starts at `http://localhost:3000` with hot reload enabled.

## Compile to Binary

```bash
bun run compile
```

This produces a standalone executable in `dist/demo`. Run it from the project root:

```bash
./dist/demo
```

The binary loads `config/server.yaml` and routes from `src/routes/` at runtime.

## Adding Routes

Create a file in `src/routes/` — the path becomes the URL:

| File | URL |
|------|-----|
| `src/routes/index.ts` | `/` |
| `src/routes/api/version.ts` | `/api/version` |
| `src/routes/api/users/[userId]/index.ts` | `/api/users/:userId` |

Export named HTTP methods (`GET`, `POST`, etc.) or a `default` handler:

```ts
export const GET = ({params, query}) => {
    return Response.json({id: params.userId});
};
```

## Adding WebSocket Routes

Export a `websocket` object with `open`, `message`, and `close` handlers:

```ts
export const websocket = {
    open(ws) {
        ws.subscribe('my-topic');
    },
    message(ws, raw) {
        ws.publish('my-topic', raw.toString());
    },
    close(ws) {
        ws.unsubscribe('my-topic');
    }
};
```
