# Template maintenance

Always answer in English.

This repository is the source of truth for the Bun Server skill. Preserve its Bun.FileSystemRouter, named HTTP exports, relative route imports, YAML configuration and source/compiled execution contracts unless an architectural change is requested.

Users keep Bun current with regular `bun upgrade`. Do not add exact Bun runtime checks, runtime version files, `packageManager`, or `engines` fields. Keep normal dependency constraints and the lockfile. Docker uses `oven/bun:latest`; CI selects current Bun.

Run `bun run verify` after changes. Use `bun run test:hurl` and `bun run test:docker` for their respective runtime/deployment changes. Exercise the browser after client changes. Tests must use isolated applications and only clean up their own temporary directories.

Edit skill instructions under `skill/`. After repository verification, use `bun run skill:sync`, `bun run skill:check`, and the installed skill validator. Never fix the generated installed assets independently of this repository.

When working with Rust, run all tests and `cargo clippy --all-targets -- -D warnings`.
