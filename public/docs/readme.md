# Bun File-System Router Demo

A **Bun-native** web server template — no frameworks, minimal dependencies.

## Features

| Feature | Bun API |
|---------|---------|
| File-system routing | `Bun.FileSystemRouter` (Next.js-style) |
| WebSocket pub/sub | `ws.subscribe()` / `ws.publish()` |
| YAML config | `YAML.parse()` + `Bun.file()` |
| Static assets | Zero-copy streaming via `Bun.file()` |
| Markdown rendering | `Bun.markdown.html()` with GFM |
| CORS | Config-driven via `server.yaml` |
| Compiled binary | `bun build --compile` support |
| Linting | Biome |

## API Endpoints

- `GET /api/health` — health check with `binary: true/false` indicator
- `GET /api/version` — Bun and package version
- `GET /api/config` — current server configuration
- `GET /api/users/:userId` — dynamic route params
- `POST /api/upload` — file upload via `multipart/form-data`
- `POST /api/validate/zod` — Zod schema validation
- `POST /api/validate/form` — form body validation
- `GET /api/chat/ws` — WebSocket upgrade (pub/sub chat)

## Pages

- [/chat](/chat) — WebSocket chat demo
- [/docs/readme](/docs/readme) — this page
- [/docs/getting-started](/docs/getting-started) — setup guide
- [/docs/architecture](/docs/architecture) — design decisions and routing approaches

## Quick Start

```bash
bun install
bun run dev
```

## Project Structure

```
src/
  index.ts                      # Server bootstrap
  core/configuration.ts         # Config types + defaults
  utils/
    loadConfig.ts               # YAML loader (Bun.file + YAML.parse)
    logger.ts                   # Bun-native logger
    cors.ts                     # CORS middleware
    staticFiles.ts              # Static file serving
  routes/
    index.ts                    # GET /
    chat.ts                     # GET /chat
    docs/[...slug].ts           # GET /docs/* (markdown)
    api/
      health.ts                 # GET /api/health
      version.ts                # GET /api/version
      config.ts                 # GET /api/config
      upload.ts                 # POST /api/upload
      chat/ws.ts                # WebSocket endpoint
      users/[userId]/index.ts   # Dynamic route
      validate/form.ts          # Form validation
      validate/zod.ts           # Zod validation
config/
  server.yaml                   # Optional (CORS, port, SSL)
public/
  chat.html                     # Chat UI
  assets/                       # CSS, JS, images
  docs/                         # Markdown content
```

---

> Built with [Bun](https://bun.sh)
