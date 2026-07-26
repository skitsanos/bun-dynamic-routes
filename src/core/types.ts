/**
 * Shared route contracts.
 *
 * Kept in their own module rather than in `src/index.ts` so route files can import
 * them without pulling in (and executing) the server entrypoint.
 */

export type RouteMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export const ALLOWED_METHODS: RouteMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export interface RouteContext
{
    req: Request;
    params: Record<string, string>;
    query: Record<string, string>;
    pathname: string;
    server: Bun.Server<SocketData>;
}

export type RouteHandler = (context: RouteContext) => Promise<Response | undefined> | Response | undefined;

export type SocketData = {
    websocket?: RouteWebSocketHandler;
    pathname: string;
    query: Record<string, string>;
    params: Record<string, string>;
};

export type RouteSocket<T = unknown> = Bun.ServerWebSocket<SocketData & T>;

export type RouteWebSocketHandler = {
    open?: (ws: RouteSocket<any>) => void | Promise<void>;
    message: (ws: RouteSocket<any>, message: string | Buffer) => void | Promise<void>;
    close?: (ws: RouteSocket<any>, code: number, reason: string) => void | Promise<void>;
    error?: (ws: RouteSocket<any>, error: Error) => void | Promise<void>;
};

export interface RouteModule
{
    GET?: RouteHandler;
    POST?: RouteHandler;
    PUT?: RouteHandler;
    PATCH?: RouteHandler;
    DELETE?: RouteHandler;
    HEAD?: RouteHandler;
    OPTIONS?: RouteHandler;
    default?: RouteHandler;
    websocket?: RouteWebSocketHandler;
}
