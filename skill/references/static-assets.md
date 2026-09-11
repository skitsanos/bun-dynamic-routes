# Public file handling

The repository intentionally serves public/ before resolving route modules. The chat page and Markdown documents have dedicated handlers. Do not claim only /assets is exposed: everything deliberately placed in public/ is public.

Use [containedFile](../assets/src/utils/files.ts) for file access. Resolve symlinks, require a regular file, and check the canonical target is inside the configured root. Decode URL file segments separately; reject traversal, encoded separators, NULs and malformed encodings. Do not replace this with a lexical path-prefix check. Keep public directories unwritable by request handlers.

[Static responses](../assets/src/utils/staticFiles.ts) use Bun.file MIME types and file bodies, short revalidation caching, weak ETags, and Last-Modified. They implement ETag/date conditionals and precondition ordering; Bun supplies HEAD and byte ranges. A weak ETag does not satisfy strong If-Match except the existence wildcard. Only fingerprinted assets should receive long immutable cache lifetimes if that feature is later added.

Live checks cover GET/HEAD, exact/list/wildcard/weak If-None-Match, If-Modified-Since, failed preconditions, 206 ranges, method rejection, and outside symlinks in generic static, chat and Markdown paths. Recheck file behavior on each supported platform when changing the implementation.
