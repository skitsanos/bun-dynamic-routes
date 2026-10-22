# Validation

The authoritative matrix is [docs/verification.md](../assets/docs/verification.md). Run from the application root:

```sh
bun --version
bun install --frozen-lockfile
bun run verify
```

This checks strict native TypeScript, configured Biome lint/import rules, real source-server tests, and the same tests through compiled execution. Tests create isolated applications, use ephemeral ports and clean up only owned temporary directories. No exact runtime comparison, route generator or native manifest check is required.

`bun run typecheck` invokes [bun check --no-script](https://bun.com/docs/runtime/check). The flag ensures the built-in checker runs even though the project has an aggregate `check` script. Keep TypeScript as a development dependency for editors and optional `bunx tsc --noEmit` comparison; it is not the runtime's type-check implementation.

Biome remains the linter/import organizer, with formatting disabled. [bun fmt](https://bun.com/docs/format) is optional and rewrites files unless called with `--check`; do not run it as part of this template's gate or introduce a formatting migration without user direction. At the Bun 1.4.4 review, [bun lint](https://bun.com/docs/lint) is canary-only. Recheck stable availability and rule coverage before replacing Biome; do not change release channels merely to remove a dependency.

When startup fails, inspect the harness diagnostic: elapsed/deadline, mode, command, working directory, PID, exit/signal state, and the bounded stdout/stderr tail. The harness stops timed-out children and drains their output before reporting. Its source/compiled regressions cover explicit exit, signal termination, and hanging initialization. Investigate a startup timeout before attributing it to a Bun upgrade.

Use `bun run test:hurl` when Hurl is installed and `bun run test:docker` for Docker work. Exercise the browser for frontend changes. A green typecheck is not HTTP/WebSocket proof. CI tests current Bun on Linux/macOS and the Linux Docker layer; do not claim Windows or remote deployment was tested unless it was.

From the installed skill directory, run `bun scripts/validate-template.ts`. It checks manifest integrity, copies the exported repository to a disposable directory, installs frozen dependencies and runs verify. Hurl runs when available; `RUN_DOCKER_TESTS=1` adds Docker. Existing caller uploads and random_file fixtures are preserved and checked. The validator does not upgrade Bun or enforce a version.

Source-repository maintainers first run skill:sync and skill:check; these compare the installed content with canonical source. The manifest's source revision may be marked dirty before a commit; hashes identify the actual exported working-tree contents.
