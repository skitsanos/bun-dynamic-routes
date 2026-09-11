# Source, compiled and Docker execution

Production source startup is `NODE_ENV=production bun run start`. Run from the project root: configuration and uploads are relative to the working directory. HOST defaults to all interfaces in production and loopback in development; PORT overrides the YAML port.

The optional `bun run compile` creates dist/demo. The binary bundles the bootstrap and static imports but loads routes from disk. Keep src/ including helpers, production node_modules/, package.json, public/ and optional config in the application working directory. It is not a self-contained distribution. Runtime detection uses Bun.main's virtual filesystem prefix. Relative route imports work in both modes.

The [Dockerfile](../assets/Dockerfile) uses oven/bun:latest, frozen production dependencies, source startup, non-root USER bun, and a dedicated writable uploads directory. Build with --pull to resolve the current image. Do not add exact image/runtime pins or a packageManager/engines requirement. Persist uploaded data with an appropriate volume when needed.

The healthcheck follows the runtime PORT and targets the normal HTTP deployment. If deliberately enabling application TLS, configure the healthcheck for HTTPS/certificate trust as well. TLS termination at a proxy does not change the default internal HTTP healthcheck.

SIGINT/SIGTERM stop new connections, close tracked sockets with 1012 and drain in-flight HTTP. SHUTDOWN_GRACE_PERIOD_MS bounds shutdown; the orchestrator's grace period must exceed it. At the deadline the server force-stops and exits.

Run `bun run test:docker` for Linux regressions and actual container checks: healthy state, port override, UID, permissions, upload content, WebSocket close code and exit status. Report source, compiled, container and remote-deployment evidence separately.
