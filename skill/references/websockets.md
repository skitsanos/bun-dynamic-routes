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
