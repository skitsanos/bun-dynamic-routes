# Route-specific WebSockets

The named websocket export follows [RouteWebSocketHandler](../assets/src/core/types.ts). Its required upgrade(context) runs before server.upgrade, returning an explicit accept/reject decision. open, close and drain are optional; message is required. Do not default-export a socket handler or assume HTTP GET authorization protects it.

An intentionally public example in src/routes/api/echo-ws.ts:

```ts
import type {RouteWebSocketHandler} from '../../core/types.ts';
export const websocket: RouteWebSocketHandler = {
    upgrade({req}) {
        const origin = req.headers.get('Origin');
        if (origin && origin !== new URL(req.url).origin)
            return {accept: false, response: new Response('Forbidden', {status: 403})};
        return {accept: true};
    },
    message(socket, data) { socket.send(data); }
};
```

For private sockets, authenticate the session in upgrade and return only the needed claims in `{accept: true, context: {...}}`. Use a configured public origin if deployment topology requires it; never blindly trust forwarded headers. A missing, invalid, thrown or rejected guard cannot grant access. The current chat permits same-origin browsers and non-browser clients without Origin; its name must be a single string up to 20 characters.

The dispatcher catches sync and async lifecycle failures and closes with 1011. It applies 1 MiB payload/backpressure limits, 60-second idle timeout, and no compression. Chat additionally limits messages to 500 characters. Adjust these deliberate limits only with corresponding tests.

The shutdown handler tracks sockets and sends 1012 while in-flight HTTP drains; a hard grace deadline stops overlong work. Verify a real two-client exchange, authorization/origin rejection, async callback failure, and graceful socket closure. See the [server tests](../assets/tests/server.test.ts) and [lifecycle tests](../assets/tests/lifecycle.test.ts).

## Bun 1.4.4 behavior to preserve

The [release notes](https://bun.com/blog/bun-v1.4.4) change Bun's built-in WebSocket client to wait for the closing handshake. Await the real `close` event before asserting a peer's close code or cleaning up its server; calling `close()` is not evidence that the handshake finished. Closing without a code produces 1005. Failed client connections emit `error`, then `close` with 1006; inspect the error for the cause rather than expecting protocol-specific codes in that failure close event. These changes concern Bun clients; keep browser and npm `ws` behavior distinct.

Native server sockets also support `pause()`, `resume()`, and `isPaused` for inbound backpressure, and a native `websocket.error(error, socket)` callback can identify the affected socket. The template's dispatcher already catches synchronous and asynchronous route callback failures and explicitly closes with 1011, so these APIs do not remove its guard, message, or shutdown contract. If adopting new APIs, check runtime and type-declaration support and add a behavioral test; do not impose an exact runtime/types version match.
