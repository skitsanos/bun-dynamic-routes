const TOPIC = 'chat';

export const websocket = {
    open(ws)
    {
        const name = ws.data?.query?.name ?? 'anonymous';
        ws.subscribe(TOPIC);
        ws.data._name = name;
        ws.publish(TOPIC, JSON.stringify({type: 'join', name}));
        ws.sendText(JSON.stringify({type: 'welcome', name, message: `Welcome, ${name}!`}));
    },
    message(ws, raw)
    {
        const name = ws.data?._name ?? 'anonymous';
        const text = raw.toString();
        ws.publish(TOPIC, JSON.stringify({type: 'message', name, text}));
    },
    close(ws)
    {
        const name = ws.data?._name ?? 'anonymous';
        ws.unsubscribe(TOPIC);
        ws.publish(TOPIC, JSON.stringify({type: 'leave', name}));
    }
};
