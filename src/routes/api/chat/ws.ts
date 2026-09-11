import type {RouteWebSocketHandler} from '../../../core/types.ts';

const TOPIC = 'chat';

export const websocket: RouteWebSocketHandler = {
    upgrade({req, query})
    {
        const origin = req.headers.get('Origin');
        if (origin && origin !== new URL(req.url).origin)
            return {accept: false, response: new Response('Forbidden', {status: 403})};
        const name = query.name ?? 'anonymous';
        if (typeof name !== 'string' || !name.trim() || name.trim().length > 20)
            return {accept: false, response: new Response('Invalid name', {status: 400})};
        // This demo is public. Authenticated applications must check their session here.
        return {accept: true, context: {name: name.trim()}};
    },
    open(ws)
    {
        const name = ws.data.context.name;
        ws.subscribe(TOPIC);
        ws.publish(TOPIC, JSON.stringify({type: 'join', name}));
        ws.sendText(JSON.stringify({type: 'welcome', name, message: `Welcome, ${name}!`}));
    },
    message(ws, raw)
    {
        const name = ws.data.context.name;
        const text = raw.toString();
        if (text.length > 500) { ws.close(1009, 'Message too long'); return; }
        ws.publish(TOPIC, JSON.stringify({type: 'message', name, text}));
    },
    close(ws)
    {
        const name = ws.data.context.name;
        ws.unsubscribe(TOPIC);
        ws.publish(TOPIC, JSON.stringify({type: 'leave', name}));
    }
};
