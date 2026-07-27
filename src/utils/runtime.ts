import {join} from 'node:path';

/**
 * True when running from a `bun build --compile` single-file executable.
 *
 * Compiled binaries resolve the entrypoint from Bun's virtual filesystem. `Bun.main`
 * is used rather than `import.meta.dir` because route modules are loaded through a
 * runtime `import()` and therefore are *not* bundled: inside a compiled binary this
 * module exists twice (bundled, plus the on-disk copy the routes import), and only a
 * process-global signal gives both copies the same answer.
 *
 * The previous `process.execPath !== Bun.which('bun')` check reported "compiled"
 * whenever bun simply was not on PATH.
 */
export const isCompiled = Bun.main.startsWith('/$bunfs');

/**
 * Project root. `import.meta.dir` is used rather than `new URL('..', import.meta.url).pathname`
 * because the latter stays percent-encoded, so any path containing a space (or
 * non-ASCII character) resolved to a directory that does not exist.
 */
export const projectRoot = isCompiled ? process.cwd() : join(import.meta.dir, '..', '..');

export const publicDir = join(projectRoot, 'public');
export const routesDir = join(projectRoot, 'src', 'routes');

/** Enables dev-only conveniences such as rescanning the route directory. */
export const isDevelopment = !isCompiled && process.env.NODE_ENV !== 'production';
