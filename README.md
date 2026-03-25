# Bun File-System Router Demo

A template project showcasing Bun-native features for building web servers — no frameworks, no extra dependencies beyond what Bun provides.

## What This Showcases

| Feature | Bun API |
|---------|---------|
| File-system routing | `Bun.FileSystemRouter` (Next.js-style) |
| WebSocket pub/sub | `ws.subscribe()` / `ws.publish()` via `Bun.serve({ websocket })` |
| YAML config | `YAML.parse()` from `"bun"` + `Bun.file()` |
| Static file serving | `Bun.file()` with zero-copy streaming |
| Markdown rendering | `Bun.markdown.html()` with GFM extensions |
| CORS | Config-driven, applied per-request |
| Compiled binary | `bun build --compile` with runtime route loading |
| Linting | Biome for lint + import sorting |

## Quick Start

```bash
bun install
bun run dev
```

Open `http://localhost:3000` — try `/chat` for WebSocket demo, `/docs/readme` for rendered Markdown.

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start with hot reload |
| `bun run compile` | Build standalone binary to `dist/demo` |
| `bun run lint` | Run Biome linter |
| `bun run lint:fix` | Auto-fix lint issues |

## Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Home page |
| `/chat` | GET | WebSocket chat UI (static HTML via `Bun.file()`) |
| `/docs/:slug` | GET | Markdown docs rendered with `Bun.markdown.html()` |
| `/api/health` | GET | Health check (includes `binary: true/false`) |
| `/api/version` | GET | Bun and package version |
| `/api/config` | GET | Current server configuration |
| `/api/users/:userId` | GET | Dynamic route params demo |
| `/api/upload` | POST | File upload via `multipart/form-data` |
| `/api/validate/zod` | POST | Zod schema validation |
| `/api/validate/form` | POST | Form body validation |
| `/api/chat/ws` | WS | WebSocket endpoint (pub/sub chat) |

## Project Structure

```
src/
  index.ts                      # Server bootstrap + request handler
  core/
    configuration.ts            # Config types + defaults
  utils/
    loadConfig.ts               # YAML config loader (Bun.file + YAML.parse)
    logger.ts                   # Simple Bun-native logger
    cors.ts                     # CORS middleware
    staticFiles.ts              # Static file serving from public/
  routes/
    index.ts                    # GET /
    chat.ts                     # GET /chat (serves public/chat.html)
    docs/[...slug].ts           # GET /docs/* (markdown rendering)
    api/
      health.ts                 # GET /api/health
      version.ts                # GET /api/version
      config.ts                 # GET /api/config
      upload.ts                 # POST /api/upload
      chat/ws.ts                # WebSocket endpoint
      users/[userId]/index.ts   # GET /api/users/:userId
      validate/
        form.ts                 # POST /api/validate/form
        zod.ts                  # POST /api/validate/zod
config/
  server.yaml                   # Optional server config (CORS, port, SSL)
public/
  chat.html                     # Chat UI
  assets/css/                   # Stylesheets
  assets/js/                    # Client-side scripts
  docs/                         # Markdown files (rendered at /docs/*)
```

## Configuration

The server loads `config/server.yaml` at startup. If the file is missing, defaults apply (`port: 3000`, no CORS).

```yaml
server:
  port: 3000
  cors:
    enabled: true
    allowedOrigins: ["http://localhost:3000"]
    allowedMethods: ["GET", "POST", "PUT", "DELETE"]
    allowedHeaders: ["Content-Type", "Authorization"]
    exposedHeaders: ["Authorization"]
    allowCredentials: true
    maxAge: 300
```

## Compiled Mode

```bash
bun run compile
./dist/demo
```

The binary resolves `config/server.yaml`, `src/routes/`, and `public/` from `process.cwd()` at runtime. The `/api/health` endpoint reports `binary: true` when running as a compiled executable.

## Design Decisions

### Why `FileSystemRouter` instead of `Bun.serve({ routes })`?

Bun offers two routing approaches:

- **`Bun.serve({ routes })`** — declarative, supports HTML imports with automatic JS/CSS bundling and HMR. Best for fullstack apps with React or other frontend frameworks.
- **`Bun.FileSystemRouter`** — file-system based discovery with dynamic `import()`. Routes are added by convention (drop a file, get a route). Best for API-heavy projects and template starters.

This project uses `FileSystemRouter` because it showcases the convention-over-configuration pattern — add a `.ts` file to `src/routes/` and it becomes a route automatically. The trade-off is that Bun's HTML import bundling (`import page from "./index.html"`) isn't available since that feature is tied to the `routes` object.

### Route file conventions

- Route files use **relative imports** (not `@/` aliases) because `FileSystemRouter` loads them via dynamic `import()` at runtime, bypassing the bundler's path resolution.
- The `@/` alias is only used in `src/index.ts` which is processed by the bundler at compile time.
