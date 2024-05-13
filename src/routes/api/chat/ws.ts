import {type Context} from 'hono';

export default async (c: Context) =>
{
    return {
        onOpen: (event:any, ws:any) =>
        {
            ws.send('Hello there!');
        },
        onMessage: (event:any) =>
        {
            console.log(event.data);
        }
    };
}