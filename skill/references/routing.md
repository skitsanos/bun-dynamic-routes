# FileSystemRouter contract

The canonical implementation is [router.ts](../assets/src/server/router.ts), used by [createServer.ts](../assets/src/server/createServer.ts). Routes are Next.js-style URL modules: `[id]` captures one segment and `[...slug].ts` captures a suffix. Named method exports share a module; a default export handles remaining standard methods. Do not translate these into `$id` directories, method filenames, or generated native manifests.

In `src/routes/api/example.ts`:

```ts
import type {RouteHandler} from '../../core/types.ts';
export const GET: RouteHandler = ({params, query, pathname}) =>
    Response.json({params, query, pathname});
```

Use relative imports for runtime-loaded route modules. The `req` field is a standard Request. Parse cookies from its headers with Bun.CookieMap and explicitly set response cookies; native BunRequest auto-mutation is not part of this pipeline.

Query data comes from URL.searchParams into an object with no inherited properties. Single values are strings, repeated keys are arrays. Path parameters remain separate, and pathname excludes the search string. Validate values before using them as strings.

HEAD uses an explicit HEAD handler or falls back to GET. Ordinary OPTIONS uses an explicit handler, otherwise 204/Allow. Unsupported methods get 405 with the actual methods. Missing URLs remain 404, including preflights. A socket-only path returns 426 for plain GET and does not inherit HEAD.

Preloading rejects invalid exports and missing WebSocket guards. The ESM registry handles caching. Existing route edits hot-reload; development misses rescan for additions. Restart after deletes/renames so the entire router table is refreshed. There are no routes:generate/routes:check commands.
