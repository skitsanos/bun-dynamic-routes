# Architecture

## Two Ways to Route in Bun

Bun provides two distinct routing approaches. This project uses **FileSystemRouter**, but understanding both helps you pick the right one.

### `Bun.serve({ routes })` — Declarative Routing

Bun's built-in `routes` object supports HTML imports that trigger automatic JS/CSS bundling:

```ts
import homepage from "./index.html";

Bun.serve({
  routes: {
    "/": homepage,           // HTML bundling + HMR
    "/api/users/:id": req => Response.json({ id: req.params.id }),
  },
  development: true,
});
```

**Best for:** Fullstack apps with React/frontend frameworks. Bun processes `<script>` and `<link>` tags, bundles TypeScript/TSX/CSS, and serves optimized assets with HMR in development.

### `Bun.FileSystemRouter` — Convention-Based Routing

Drop a `.ts` file in `src/routes/` and it becomes a route:

```ts
const router = new Bun.FileSystemRouter({
  style: "nextjs",
  dir: "./src/routes",
});
```

| File | URL |
|------|-----|
| `routes/index.ts` | `/` |
| `routes/api/version.ts` | `/api/version` |
| `routes/api/users/[userId]/index.ts` | `/api/users/:userId` |
| `routes/docs/[...slug].ts` | `/docs/*` |

**Best for:** API servers, template projects, cases where routes should be discoverable by convention.

### Trade-offs

| | `routes` object | `FileSystemRouter` |
|---|---|---|
| HTML bundling | Built-in (JS/CSS/TSX) | Not available |
| HMR | Built-in | Via `--hot` flag |
| Route discovery | Explicit in code | Automatic from filesystem |
| Dynamic params | `/users/:id` | `[userId]` directory naming |
| Catch-all | `/api/*` | `[...slug].ts` |
| WebSocket | In `fetch` handler | Per-route `websocket` export |
| Compiled mode | HTML imports bundle into binary | Routes loaded from disk at runtime |

### Why This Project Uses FileSystemRouter

1. **Convention over configuration** — add a file, get a route
2. **Per-route WebSocket handlers** — each route can export its own `websocket` object
3. **Template-friendly** — users extend by adding files, not editing a central routes object
4. **Method exports** — `export const GET`, `export const POST` per file

## Compiled Mode

When built with `bun build --compile`, the entry point (`src/index.ts`) is bundled into the binary, but route files are loaded dynamically via `import()` at runtime. This means:

- **`src/routes/`** must exist on disk alongside the binary
- **`config/server.yaml`** is loaded from `process.cwd()` (optional)
- **`public/`** is served from `process.cwd()` for static assets
- **`@/` import aliases** don't work in route files (use relative imports)

The `/api/health` endpoint reports `binary: true` when running as a compiled executable, detected via:

```ts
const isCompiled = process.execPath !== Bun.which("bun");
```

## Configuration

Config is loaded from `config/server.yaml` using Bun's native `YAML.parse()`:

```ts
import { YAML } from "bun";
const raw = await Bun.file("config/server.yaml").text();
const config = YAML.parse(raw);
```

If the file is missing, defaults apply. The config is merged with defaults using a simple spread:

```ts
const config = {
  ...defaults,
  ...loaded,
  server: { ...defaults.server, ...loaded?.server },
};
```

## Static Files

Files in `public/` are served before routes are checked. The static middleware uses `Bun.file()` for zero-copy streaming and includes:

- MIME type detection from file extension
- `Cache-Control: public, max-age=3600`
- Path traversal protection

## Markdown Rendering

The `/docs/:slug` route loads `.md` files from `public/docs/` and renders them with:

```ts
const html = Bun.markdown.html(markdown, {
  tables: true,
  strikethrough: true,
  tasklists: true,
  autolinks: true,
  headings: { ids: true },
});
```

Add a `.md` file to `public/docs/` and it's instantly available at `/docs/<filename>`.

## WebSocket Architecture

Bun's `serve()` takes a single global `websocket` handler. This project multiplexes per-route handlers by storing the route's handler in `ws.data` during upgrade:

```
Request → FileSystemRouter.match() → route.websocket exists?
  → server.upgrade(req, { data: { websocket: route.websocket } })
    → Global handler delegates to ws.data.websocket
```

This allows each route file to define its own WebSocket behavior independently.
