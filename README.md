# Bun File-System Router Template

This repository is the source of truth for our Bun projects and the Bun Server skill. It uses Bun's Next.js-style `FileSystemRouter`, named HTTP method exports, YAML configuration validated with Zod, static files, Markdown docs, and per-route WebSockets. TypeScript runs directly; an optional compiled entrypoint is also supported.

## Start and verify

Keep Bun current with regular user-run `bun upgrade`. This template does not require an exact Bun release, `packageManager`, or `engines` fields. Dependency versions remain in `bun.lock`; `@types/bun` is a development dependency, not a runtime-version gate.

```sh
bun install --frozen-lockfile
bun run verify
bun run dev
```

Open `http://localhost:3000`, `/chat`, or `/docs/readme`. After upgrading Bun or dependencies, rerun verification. CI uses current Bun on Linux and macOS; Docker uses `oven/bun:latest` and pulls the current image during verification.

| Command | Behavior |
|---|---|
| `bun run dev` / `task dev` | Source server with hot reload |
| `bun run start` | Source server; set NODE_ENV=production for production |
| `bun run check` / `task check` | Strict TypeScript, Biome, isolated regression tests |
| `bun run verify` / `task verify` | Check plus the same regressions against a compiled executable |
| `bun run test` / `task test` | Real HTTP/WebSocket/config/shutdown regressions in temporary applications |
| `bun run test:hurl` / `task test:hurl` | Original 14-request smoke suite and 8 MiB upload in an isolated application; requires Hurl |
| `bun run test:docker` / `task test:docker` | Build, Linux regressions, live container health/port/UID/upload/WebSocket shutdown; requires Docker |
| `bun run compile` / `task compile` | Compile the entrypoint to `dist/demo` |
| `bun run lint` / `bun run lint:fix` | Lint/import checks or reviewed fixes; formatter disabled |

Tests start their own servers on ephemeral ports and only delete temporary directories they create. They do not use a caller's `uploads/`, overwrite a caller's `random_file`, or require a prestarted application. See [verification and finding coverage](docs/verification.md).

## Routes and handler contract

| File | URL / export |
|---|---|
| `src/routes/index.ts` | `/` — GET |
| `src/routes/api/users/[userId]/index.ts` | `/api/users/:userId` — GET |
| `src/routes/api/upload.ts` | `/api/upload` — POST |
| `src/routes/docs/[...slug].ts` | `/docs/*` — GET |
| `src/routes/api/chat/ws.ts` | `/api/chat/ws` — websocket |

For example, in `src/routes/api/example.ts`:

```ts
import type {RouteHandler} from '../../core/types.ts';

export const GET: RouteHandler = ({req, params, query, pathname}) =>
    Response.json({method: req.method, params, query, pathname});
```

Use named GET, POST, PUT, PATCH, DELETE, HEAD, or OPTIONS exports. A default handler handles remaining standard methods. Relative imports in route modules also work when the entrypoint is compiled. There is no route-generation command or manifest.

`req` is a standard Request, not a native-route BunRequest. `params` contains path parameters; `query` contains search parameters, with repeated keys represented as arrays. Query keys do not replace path parameters. `pathname` excludes the query string. Use `Bun.CookieMap` to parse Cookie headers and explicitly add Set-Cookie response headers when needed.

HEAD falls back to GET unless overridden, with Bun suppressing the body. Ordinary OPTIONS respects an explicit handler, otherwise returns 204. Unsupported methods return 405 with a truthful Allow header. Missing paths return 404, including CORS preflight requests. Existing route edits hot-reload; a new route is discovered on a development miss. Removing or renaming routes should be followed by a restart to refresh the complete route table.

## WebSockets

A `websocket` export must provide `upgrade(context)` and `message(socket, data)`. The guard returns `{accept: true, context?: {...}}` or `{accept: false, response: Response}`. Authenticate non-public sockets and validate the browser Origin in this guard: a GET handler or HTTP CORS settings do not authorize an upgrade. Missing guards fail startup; thrown/rejected guards never upgrade. Async lifecycle failures close the socket with 1011.

The chat example is explicitly public and accepts same-origin browser clients or clients without an Origin header. Names must be a single nonempty string up to 20 characters; chat messages are limited to 500 characters. The global dispatcher sets a 1 MiB payload/backpressure limit and 60-second idle timeout. Open sockets receive 1012 during shutdown.

## Configuration and files

`config/server.yaml` is optional and loaded relative to the working directory. Zod supplies nested defaults and rejects invalid values before binding. Run from the project root, including in compiled mode.

| Environment variable | Behavior |
|---|---|
| `PORT` | Overrides YAML port; digits only, 0–65535; 0 requests an ephemeral port |
| `HOST` | Overrides hostname; default loopback in development, all interfaces in production |
| `NODE_ENV` | development, test, or production |
| `LOG_LEVEL` | TRACE, DEBUG, INFO, WARN, ERROR, FATAL; overrides YAML |
| `SERVER_NAME` | Overrides the service response header; rejects control characters |
| `SHUTDOWN_GRACE_PERIOD_MS` | Overrides the 5000 ms shutdown deadline; 0–60000 |

YAML also configures CORS, `server.trustProxy` (default false), TLS PEM contents, and `server.maxRequestBodySize` (50 MiB). CORS is disabled when omitted; the example YAML allows `http://localhost:3000`. Wildcard origins with credentials are rejected. Forwarded client-IP headers are consulted only when proxy trust is explicitly enabled.

Everything under `public/` is deliberately public. Canonical paths must remain inside the public root, including symlink targets; only regular files are served. The chat and Markdown loaders apply the same containment rule. Assets use revalidation caching, ETag/Last-Modified conditionals, preconditions, and Bun file ranges. Markdown files are trusted repository content, not an upload/CMS channel; sanitize untrusted Markdown before introducing such a channel.

Uploads require multipart data. Each is saved under `uploads/` with a UUID-based filename and exclusive creation, so concurrent requests cannot replace existing files. Keep the dedicated upload directory separate from the public tree. The runtime rejects a symlinked upload directory.

SIGTERM/SIGINT stop accepting connections, close tracked sockets, and allow in-flight HTTP requests to complete. At the configured deadline the process force-stops; give the orchestrator a longer grace period.

## Compiled mode and Docker

```sh
bun run compile
./dist/demo
task docker-build
task docker-run
```

The compiled executable bundles the entrypoint and its static imports. It is **not a self-contained distribution**: retain `src/` (including route helpers), `public/`, `package.json`, and production `node_modules/` in the working directory; retain optional config as needed. Dynamically imported routes read these files at runtime. `/api/health` reports compiled mode using `Bun.main.startsWith('/$bunfs')`.

Docker runs source directly as the unprivileged `bun` user, installs frozen production dependencies, and gives that user write access to `/app/uploads`. Set PORT to change the listener and healthcheck port. Mount durable upload storage when files must survive container replacement. TLS terminated inside the app requires an HTTPS-aware healthcheck configuration; the supplied Docker healthcheck targets the default HTTP deployment.

## Skill synchronization

Canonical skill instructions live in `skill/`; generated assets come from this repository. See [skill maintenance](docs/skill-maintenance.md) for the export, drift check, and independent generated-template validation. Edit this repository, verify it, then regenerate the installed skill. Do not maintain a second routing implementation in the installed assets.
