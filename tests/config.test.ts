import {expect, test} from 'bun:test';
import {parseConfiguration} from '../src/core/configuration.ts';

test('missing YAML gets nested defaults and environment overrides', () =>
{
    const defaults = parseConfiguration(undefined, {});
    expect(defaults.server.port).toBe(3000);
    expect(defaults.server.hostname).toBe('127.0.0.1');
    expect(defaults.server.maxRequestBodySize).toBe(50 * 1024 * 1024);
    expect(defaults.server.cors).toBeUndefined();
    expect(parseConfiguration({}, {NODE_ENV: 'production'}).server.hostname).toBe('0.0.0.0');
    const config = parseConfiguration({logLevel: 'WARN', server: {port: 3001}}, {
        PORT: '0', HOST: 'localhost', LOG_LEVEL: 'debug', SERVER_NAME: 'test-service', SHUTDOWN_GRACE_PERIOD_MS: '100'
    });
    expect(config.server.port).toBe(0);
    expect(config.server.hostname).toBe('localhost');
    expect(config.server.shutdownGracePeriodMs).toBe(100);
    expect(config.logLevel).toBe('DEBUG');
    expect(config.serviceName).toBe('test-service');
});
test('invalid YAML, header injection and wildcard credentials fail validation', () =>
{
    expect(() => parseConfiguration({server: {port: '3000'}}, {})).toThrow();
    expect(() => parseConfiguration({}, {SERVER_NAME: 'bad\r\nvalue'})).toThrow();
    expect(() => parseConfiguration({}, {PORT: '0x1234'})).toThrow();
    expect(() => parseConfiguration({server: {cors: {enabled: true, allowedOrigins: ['*'], allowCredentials: true}}}, {})).toThrow();
});
