/** Use relative imports in routes: compiled mode loads these modules from disk. */
export const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
export type RouteMethod = typeof ALLOWED_METHODS[number];
export type Query = Record<string, string | string[]>;
export interface RouteContext
{
    req: Request;
    params: Record<string, string>;
    query: Query;
    pathname: string;
    server: Bun.Server<SocketData>;
}
export type RouteHandler = (context: RouteContext) => Promise<Response | undefined> | Response | undefined;
export type UpgradeDecision = {accept: true; context?: Readonly<Record<string, unknown>>}
    | {accept: false; response: Response};
export interface SocketData
{
    websocket: RouteWebSocketHandler;
    context: Readonly<Record<string, unknown>>;
    pathname: string;
    query: Query;
    params: Record<string, string>;
}
export type RouteSocket = Bun.ServerWebSocket<SocketData>;
export interface RouteWebSocketHandler
{
    upgrade: (context: RouteContext) => UpgradeDecision | Promise<UpgradeDecision>;
    open?: (ws: RouteSocket) => void | Promise<void>;
    message: (ws: RouteSocket, message: string | Buffer) => void | Promise<void>;
    close?: (ws: RouteSocket, code: number, reason: string) => void | Promise<void>;
    drain?: (ws: RouteSocket) => void | Promise<void>;
}
export type RouteModule = Partial<Record<RouteMethod, RouteHandler>> & {
    default?: RouteHandler;
    websocket?: RouteWebSocketHandler;
};
