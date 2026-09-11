# Maintaining the Bun Server skill

This repository is the source of truth for both the application template and the Bun Server skill. Author the entrypoint in `skill/SKILL.md.template`, supporting resources in `skill/`, and application code in the normal repository directories. Never maintain a second implementation in the installed skill's assets.

## Synchronization

From this repository:

```sh
bun run verify
bun run skill:sync
bun run skill:check
bun ~/.codex/skills/bun-server/scripts/validate-template.ts
# Include production container checks when Docker is available:
RUN_DOCKER_TESTS=1 bun ~/.codex/skills/bun-server/scripts/validate-template.ts
```

The default destination is `$CODEX_HOME/skills/bun-server`, or `~/.codex/skills/bun-server` when `CODEX_HOME` is unset. Both synchronization commands accept `--target /absolute/path/to/bun-server`; CI uses a temporary destination. The validator path must refer to that destination too.

`skill:sync` copies `skill/` to the installed skill root, renames its `SKILL.md.template` entrypoint to `SKILL.md`, and exports the application into `assets/`. The exported project includes the repository's `skill/`, tests, documentation, and maintenance scripts. Its source entrypoint retains the `.template` suffix so Codex cannot discover it as a second installed skill. It contains no nested exported assets, so generation is finite. Explicit directory and file lists in `scripts/skill-export.ts` exclude Git internals, dependencies, uploads, local environment files, and compiled output. Source symlinks and special files are rejected.

Generation stages and verifies the complete bundle before replacing the destination. It refuses overlapping source/destination paths, target symlinks, and unrelated nonempty directories. It can replace an existing Bun Server skill, including its old generated files. Back up any local customizations before replacing a skill; intentional changes belong in this repository.

## Provenance and drift

`.source-manifest.json` records a SHA-256 hash for every exported file, plus the source Git revision and whether the working tree was dirty. Revision information is provenance, not a substitute for checking file contents. A dirty working tree can be exported deliberately; the actual bytes are recorded. In a copied project without Git, the revision and dirty fields are null.

`skill:check` detects changed, missing, or extra files in the installation and compares them to the current repository. Both it and standalone validation require exactly one discoverable `SKILL.md`, at the bundle root, even when every file hash matches. Run it after every source, dependency, configuration, test, documentation, or skill change. Synchronize again when it reports drift. A standalone installed validator can check the bundle's own integrity without needing the original checkout; only `skill:check` from the original checkout establishes current repository parity.

CI validates a fresh export on Linux and macOS. It does not modify anyone's installed skill. `tests/skill.test.ts` also verifies single-entrypoint discovery, re-exporting the bundled project, content drift, safe replacement, unexpected/missing files, and rejected unsafe paths. After committing template changes, synchronize from the clean checkout so the installed manifest records that commit with `dirty: false`.

## Validation and runtime policy

The installed validator copies assets into a fresh temporary directory, installs the frozen dependency lockfile, and runs type checking, Biome, source tests, and compiled tests. It runs Hurl if available and Docker when `RUN_DOCKER_TESTS=1`. Synthetic sentinel files in the temporary project's `uploads/` and `random_file` verify that the runners preserve existing caller data. The installed assets are checked again after validation and are never the test workspace.

Bun is maintained by the user through regular `bun upgrade` runs. Neither the repository nor the skill requires a particular Bun release. Do not add `packageManager`, `engines`, a runtime version file, a runtime synchronization command, or equality checks against `@types/bun`. Keep normal dependency ranges and the frozen dependency lockfile, use the latest stable Bun in CI, and use `oven/bun:latest` for Docker. Run the same checks after dependency or runtime updates; test behavior instead of enforcing a version string.
