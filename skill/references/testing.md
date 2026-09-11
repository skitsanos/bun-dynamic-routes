# Validation

The authoritative matrix is [docs/verification.md](../assets/docs/verification.md). Run from the application root:

```sh
bun --version
bun install --frozen-lockfile
bun run verify
```

This checks strict TypeScript, configured Biome lint/import rules, real source-server tests, and the same tests through compiled execution. Tests create isolated applications, use ephemeral ports and clean up only owned temporary directories. No exact runtime comparison, route generator or native manifest check is required.

Use `bun run test:hurl` when Hurl is installed and `bun run test:docker` for Docker work. Exercise the browser for frontend changes. A green typecheck is not HTTP/WebSocket proof. CI tests current Bun on Linux/macOS and the Linux Docker layer; do not claim Windows or remote deployment was tested unless it was.

From the installed skill directory, run `bun scripts/validate-template.ts`. It checks manifest integrity, copies the exported repository to a disposable directory, installs frozen dependencies and runs verify. Hurl runs when available; `RUN_DOCKER_TESTS=1` adds Docker. Existing caller uploads and random_file fixtures are preserved and checked. The validator does not upgrade Bun or enforce a version.

Source-repository maintainers first run skill:sync and skill:check; these compare the installed content with canonical source. The manifest's source revision may be marked dirty before a commit; hashes identify the actual exported working-tree contents.
