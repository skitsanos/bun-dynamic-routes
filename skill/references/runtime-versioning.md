# Runtime maintenance

Users keep Bun current by regularly running `bun upgrade`. The template and skill do not require a specific Bun version, engines/packageManager declarations, or a runtime version file. Do not upgrade the user's installation merely to apply this skill. When a requested feature is unavailable, report the observed capability failure and the upgrade needed for that feature instead of imposing a general version gate.

Run `bun --version` to record the tested runtime, `bun install --frozen-lockfile` to verify dependency reproducibility, and `bun run verify` to exercise the actual behavior. Keep @types/bun as a normal development dependency; its lockfile version need not equal the executable. Review dependency changes separately from runtime updates and use `bun audit` after dependency changes.

Docker uses `oven/bun:latest`, resolved with a pull when building/testing. CI selects current Bun. Neither uses an exact Bun release. A recorded test version is evidence, not a minimum/exact requirement. Do not reintroduce runtime:sync/runtime:freshness scripts that rewrite manifests or enforce equality with package pins.
