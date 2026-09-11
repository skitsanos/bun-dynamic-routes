import type {RouteSocket, SocketData} from '../core/types.ts';
import Logger from '../utils/logger.ts';

const logger = new Logger('WebSocket');
export const createWebSockets = () =>
{
    const sockets = new Set<RouteSocket>();
    const invoke = (ws: RouteSocket, callback: () => void | Promise<void>) =>
    {
        const failed = (error: unknown) =>
        {
            logger.error('WebSocket callback failed', {error});
            ws.close(1011, 'Handler failed');
        };
        try { void Promise.resolve(callback()).catch(failed); }
        catch (error) { failed(error); }
    };
    const handlers: Bun.WebSocketHandler<SocketData> = {
        maxPayloadLength: 1024 * 1024,
        idleTimeout: 60,
        backpressureLimit: 1024 * 1024,
        closeOnBackpressureLimit: true,
        perMessageDeflate: false,
        open(ws) { sockets.add(ws); invoke(ws, () => ws.data.websocket.open?.(ws)); },
        message(ws, message) { invoke(ws, () => ws.data.websocket.message(ws, message)); },
        close(ws, code, reason) { sockets.delete(ws); invoke(ws, () => ws.data.websocket.close?.(ws, code, reason)); },
        drain(ws) { invoke(ws, () => ws.data.websocket.drain?.(ws)); }
    };
    return {handlers, sockets};
};
