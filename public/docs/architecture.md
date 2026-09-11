# Architecture

## FileSystemRouter and route contracts

`src/index.ts` loads configuration, creates the server, and installs shutdown handling. `src/server/createServer.ts` owns the request pipeline; `router.ts`, `websockets.ts`, and `shutdown.ts` hold focused runtime behavior.

`Bun.FileSystemRouter` resolves a Next.js-style tree. Route modules are dynamically imported and explicitly export HTTP methods or a guarded `websocket` object:

| File | URL |
|---|---|
| `src/routes/index.ts` | `/` |
| `src/routes/api/version.ts` | `/api/version` |
| `src/routes/api/users/[userId]/index.ts` | `/api/users/:userId` |
| `src/routes/docs/[...slug].ts` | `/docs/*` |

No generated manifest is required. The ESM registry caches modules; the application does not keep a second module cache. Existing route edits work with hot reload, and development misses rescan for new routes. Restart after deleting or renaming routes. Invalid exports and WebSockets without an upgrade guard fail startup.

Handlers receive `{req, server, params, query, pathname}`. `req` is a standard Request. Query values are strings or arrays for repeated keys, stored independently from path parameters in an object without inherited properties. `pathname` is the URL pathname without its search string.

## HTTP pipeline

1. Reject malformed percent encoding.
2. Resolve a contained regular file in `public/`, or a route module.
3. For an existing path, evaluate genuine CORS preflight against that path's methods and configured headers/origins.
4. Serve the file or execute the method/upgrade handler.
5. Apply response timing, service, CORS/Vary headers, and access logging.

HEAD falls back to GET unless explicitly handled. OPTIONS with no Access-Control-Request-Method is an ordinary request and respects the route's OPTIONS export. Missing methods return 405 and Allow; missing paths, including preflights, return 404. Production responses use a generic 500 body while operators receive diagnostics.

Native `Bun.serve({routes})` is a different supported Bun API, useful for HTML-import applications. It is not this template's dispatch contract. Its automatic BunRequest params/cookies and HTML bundling should not be assumed on these custom fetch handlers.

## Configuration and runtime paths

`config/server.yaml` is loaded from the working directory and validated with Zod. The server object's `prefault({})` allows nested defaults to be parsed when the block is absent. Environment variables override validated YAML values. Invalid configured environment values, header control characters, and credentialed wildcard CORS fail before listening.

Source mode resolves routes/public assets from the module's project root. Configuration and uploads use the working directory. Run from the project root for consistent paths. In compiled mode the project root is also the working directory.

```ts
const isCompiled = Bun.main.startsWith('/$bunfs');
```

The executable bundles the bootstrap but loads routes from disk. Keep `src/`, production dependencies, `package.json`, public assets, and optional config with the deployed application. Dynamic route imports remain relative.

## Files and rendered documentation

Public files, chat HTML, and Markdown documents use canonical filesystem containment checks. A symlink cannot expose a file outside its configured root. Directories are not file responses. URL file segments reject encoded separators, dot segments, and NULs.

Static assets use `Bun.file()` MIME detection and file responses, revalidation caching, weak ETags, Last-Modified dates, 304 conditionals, 412 preconditions, and Bun's byte-range responses. A weak ETag cannot satisfy a strong If-Match comparison; If-Match: * can succeed for an existing file.

Markdown under `public/docs/` is trusted repository-owned content rendered by `Bun.markdown.html()`. Keep uploads and untrusted CMS input outside this tree. HTML generation is not sanitization.

Uploads require multipart data, use UUID-based sanitized names and exclusive file creation, and remain outside the public tree. Parsing mistakes return client errors.

## WebSockets and shutdown

Every WebSocket route defines `upgrade(context)`. It decides origin and authentication policy before `server.upgrade()`, and passes only approved context into `ws.data`. HTTP GET handlers and CORS settings are separate from WebSocket authorization. The public chat explicitly validates same-origin browsers and a single display name.

One dispatcher delegates lifecycle callbacks and handles their asynchronous failures. It tracks open sockets, applies message/backpressure/idle limits, and closes rejected callback executions with 1011. During SIGTERM/SIGINT it sends active sockets 1012, drains in-flight HTTP, and forces termination at a configurable deadline.

## Runtime updates

Users keep Bun current with `bun upgrade` and rerun verification. There is no exact runtime requirement or packageManager/engines declaration. The lockfile controls packages; CI selects current Bun and Docker pulls `oven/bun:latest`.
