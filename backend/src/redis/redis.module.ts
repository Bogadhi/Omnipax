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
const logger = new Logger('RedisModule');

```
    const redisUrl = configService.get<string>('REDIS_URL');
    const isProd = configService.get('NODE_ENV') === 'production';

    if (!redisUrl) {
      if (isProd) {
        throw new Error(
          '[RedisModule] REDIS_URL is missing. Redis is required in production.',
        );
      }

      logger.warn(
        '⚠️  REDIS_URL not set. Running in DEV mode without Redis. ' +
        'Cache, BullMQ queues, seat locking and websocket scaling will be disabled.',
      );
      return null;
    }

    // Parse host + port for connectivity probe
    let host = '127.0.0.1';
    let port = 6379;

    try {
      const parsed = new URL(redisUrl);
      host = parsed.hostname;
      port = Number(parsed.port) || 6379;
    } catch {
      logger.warn('⚠️ Failed to parse REDIS_URL, skipping probe.');
    }

    const available = await probeRedis(host, port);

    if (!available) {
      if (isProd) {
        throw new Error(
          `[RedisModule] Cannot connect to Redis at ${host}:${port}. ` +
          `Check REDIS_URL environment variable.`,
        );
      }

      logger.warn(
        `⚠️ Redis unavailable at ${host}:${port}. ` +
        `Running in DEV mode — Redis-dependent features disabled.`,
      );
      return null;
    }

    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
    });

    client.on('error', (err: Error) => {
      logger.error(`[Redis] Runtime error: ${err.message}`);
    });

    logger.log(`✅ Redis connected using ${redisUrl}`);
    return client;
  },
  inject: [ConfigService],
},
```

],
exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
