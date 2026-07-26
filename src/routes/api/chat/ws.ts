import type {RouteSocket, RouteWebSocketHandler} from '../../../core/types.ts';

const TOPIC = 'chat';

// The display name is stashed on the socket so `message`/`close` can recover it
// after `open` has resolved it from the query string.
type ChatSocket = RouteSocket<{_name?: string}>;

export const websocket: RouteWebSocketHandler = {
    open(ws: ChatSocket)
    {
        const name = ws.data?.query?.name ?? 'anonymous';
        ws.subscribe(TOPIC);
        ws.data._name = name;
        ws.publish(TOPIC, JSON.stringify({type: 'join', name}));
        ws.sendText(JSON.stringify({type: 'welcome', name, message: `Welcome, ${name}!`}));
    },
    message(ws: ChatSocket, raw)
    {
        const name = ws.data?._name ?? 'anonymous';
        const text = raw.toString();
        ws.publish(TOPIC, JSON.stringify({type: 'message', name, text}));
    },
    close(ws: ChatSocket)
    {
        const name = ws.data?._name ?? 'anonymous';
        ws.unsubscribe(TOPIC);
        ws.publish(TOPIC, JSON.stringify({type: 'leave', name}));
    }
};
