import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as net from 'net';

/**
 * Probe Redis TCP port before constructing the client.
 * Returns true if Redis responds within timeoutMs, false otherwise.
 * This avoids ioredis emitting unhandled 'error' events on startup.
 */
function probeRedis(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (ok: boolean) => { socket.destroy(); resolve(ok); };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const host   = configService.get<string>('REDIS_HOST') || '127.0.0.1';
        const port   = configService.get<number>('REDIS_PORT') || 6379;
        const isProd = configService.get('NODE_ENV') === 'production';
        const logger = new Logger('RedisModule');

        const available = await probeRedis(host, port);

        if (!available) {
          if (isProd) {
            // Production: hard fail — Redis is mandatory
            throw new Error(
              `[RedisModule] Cannot connect to Redis at ${host}:${port}. ` +
              `Redis is required in production. Check REDIS_HOST / REDIS_PORT in .env.`,
            );
          }
          // Development: warn and export null — callers must null-guard
          logger.warn(
            `⚠️  Redis unavailable at ${host}:${port}. ` +
            `Running in DEV mode — Redis-dependent features (cache, throttle, ` +
            `socket adapter) are disabled. Start Redis to re-enable them.`,
          );
          return null;
        }

        const client = new Redis({ host, port, maxRetriesPerRequest: null });

        client.on('error', (err: Error) => {
          logger.error(`[Redis] Runtime error: ${err.message}`);
        });

        logger.log(`✅ Redis connected at ${host}:${port}`);
        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
