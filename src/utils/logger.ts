/**
 * Simple application logger for Bun
 */

export enum LogLevel
{
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
    FATAL = 5
}

const LEVEL_COLORS: Record<string, string> = {
    TRACE: '#999',
    DEBUG: '#999',
    INFO: 'green',
    WARN: 'orange',
    ERROR: 'red',
    FATAL: 'darkred'
};

const colorize = (text: string, color: string): string =>
{
    const ansi = Bun.color(color, 'ansi');
    return ansi ? `${ansi}${text}\x1b[0m` : text;
};

/**
 * Errors carry their useful fields on non-enumerable properties, so a plain
 * `JSON.stringify({error})` yields `{"error":{}}` and silently loses everything.
 * Convert them to a serializable shape instead, following the `cause` chain.
 */
const serializeError = (error: Error): Record<string, unknown> =>
{
    const serialized: Record<string, unknown> = {
        name: error.name,
        message: error.message
    };

    if (error.stack)
    {
        serialized.stack = error.stack;
    }

    if (error.cause !== undefined)
    {
        serialized.cause = error.cause instanceof Error ? serializeError(error.cause) : error.cause;
    }

    return serialized;
};

const stringify = (value: unknown): string =>
{
    if (value instanceof Error)
    {
        return value.stack ?? `${value.name}: ${value.message}`;
    }
    if (typeof value === 'object' && value !== null)
    {
        try
        {
            return JSON.stringify(value, (_key, nested) => nested instanceof Error ? serializeError(nested) : nested);
        }
        catch
        {
            return String(value);
        }
    }
    return String(value);
};

export class Logger
{
    private readonly context: string;
    private readonly level: LogLevel;

    constructor(context: string, level: LogLevel = LogLevel.INFO)
    {
        this.context = context;
        this.level = level;
    }

    private log(level: LogLevel, message: unknown, ...args: unknown[]): void
    {
        if (level < this.level)
        {
            return;
        }

        const levelName = LogLevel[level];
        const timestamp = new Date().toISOString();
        const parts = [
            colorize(timestamp, '#888'),
            colorize(`[${levelName}]`, LEVEL_COLORS[levelName] ?? '#999'),
            colorize(`[${this.context}]`, '#99bbcc'),
            stringify(message)
        ];

        if (args.length > 0)
        {
            parts.push(...args.map(stringify));
        }

        const out = level >= LogLevel.ERROR ? console.error : console.log;
        out(parts.join(' '));
    }

    trace(message: unknown, ...args: unknown[]): void
    {
        this.log(LogLevel.TRACE, message, ...args);
    }

    debug(message: unknown, ...args: unknown[]): void
    {
        this.log(LogLevel.DEBUG, message, ...args);
    }

    info(message: unknown, ...args: unknown[]): void
    {
        this.log(LogLevel.INFO, message, ...args);
    }

    warn(message: unknown, ...args: unknown[]): void
    {
        this.log(LogLevel.WARN, message, ...args);
    }

    error(message: unknown, ...args: unknown[]): void
    {
        this.log(LogLevel.ERROR, message, ...args);
    }

    fatal(message: unknown, ...args: unknown[]): void
    {
        this.log(LogLevel.FATAL, message, ...args);
    }
}

export default Logger;
