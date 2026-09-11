# Template verification

Run `bun install --frozen-lockfile` followed by `bun run verify` after dependency changes or a user-run `bun upgrade`. The installed runtime is tested directly; its version is reported for evidence and is never compared with an exact required Bun release. `@types/bun` remains a normal development dependency.

`bun run check` runs strict TypeScript, Biome with warnings treated as failures, and the Bun test suite. `bun run verify` adds compiled execution of the same suite. Biome covers source, tests, scripts, browser JavaScript, root JSON, and skill validator code; formatting remains disabled and import organization enabled. CSS, HTML, Markdown, and YAML are not claimed as linted by this command.

Every server regression runs in a temporary application with a fresh upload directory and ephemeral port. Compiled tests create and remove their own binary. Cleanup only removes the temporary tree created by that runner. Child processes are stopped even after a failing assertion.

| Reviewed finding | Executable verification |
|---|---|
| Destructive test cleanup | Test/Hurl runners allocate their own temporary application; no fixed caller file or uploads cleanup |
| Concurrent upload overwrite | 30 uploads return unique names and retain all 30 distinct payloads; existing sentinel preserved |
| Static symlink escape | Outside links fail for generic static files, Markdown documents, and the chat HTML route |
| WebSocket authorization bypass | GET 401 plus upgrade 401; thrown guard 500 without upgrade; missing guard fails startup |
| GET/HEAD semantics | All shipped GET examples support HEAD; explicit HEAD wins; write-only/socket-only paths reject it |
| OPTIONS/CORS routing | Explicit ordinary OPTIONS wins; unknown-path preflight 404; unsupported method/header rejected |
| Cache variation | Allowed, denied and absent Origin variants have Vary, including static 304 responses |
| Malformed uploads | Wrong media type 415; malformed multipart 400; missing file 400 |
| Unbounded shutdown | Active socket closes 1012, in-flight HTTP finishes, overlong request aborts at deadline |
| Query type/parameter confusion | Repeated keys remain arrays, hostile keys are own properties, path/search params stay separate |
| Static HTTP conditionals | ETag wildcard/list/weak comparisons, modified-since, precondition precedence and 412, range 206 |

Configuration tests also cover nested defaults, overrides, wildcard credentials, invalid types, numeric input and response-header injection. The lifecycle suite tests edited/new routes in hot mode during source runs; this case is excluded from compiled runs. TLS uses a temporary self-signed certificate when OpenSSL is available and verifies that key and certificate material remain private. A missing OpenSSL executable explicitly skips only that test.

The browser demo must be checked after client changes: join chat, exchange messages, inspect visible rendering and console errors.

## Hurl and Docker

`bun run test:hurl` requires [Hurl](https://hurl.dev/docs/installation.html), starts a disposable source server, and runs the 14-request smoke suite including an 8 MiB synthetic upload. It creates no file named random_file in the caller's working directory.

`bun run test:docker` requires Docker. It pulls/builds `oven/bun:latest`, runs the HTTP/lifecycle regressions in Linux, then runs the actual image with a port override. It verifies health, non-root UID, application-file permissions, a writable uploads directory, HTTP/asset/upload behavior, and socket shutdown/exit status. The container and test image are removed afterwards.

CI runs `bun run verify` on Linux and macOS with current Bun and runs Docker verification on Linux. Local test results do not imply that a newly added remote workflow has run. Windows is not in the current verified CI matrix.

## Skill parity

After the repository passes, export its skill and run both the content parity check and the generated-template validator as described in [skill maintenance](skill-maintenance.md). The validator must use these repository checks, not a separate implementation with different routing or version gates.
