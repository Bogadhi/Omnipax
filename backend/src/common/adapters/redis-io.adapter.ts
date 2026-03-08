import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';
import { INestApplicationContext, Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private readonly logger = new Logger(RedisIoAdapter.name);

  constructor(
    private app: INestApplicationContext,
    private configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const url = this.configService.get<string>('REDIS_URL') || 'redis://127.0.0.1:6379';
    const isProd = this.configService.get('NODE_ENV') === 'production';

    let pubClient: RedisClientType | null = null;
    let subClient: RedisClientType | null = null;

    try {
      pubClient = createClient({
        url,
        socket: { 
          connectTimeout: 2000,
          reconnectStrategy: false
        },
      }) as RedisClientType;
      subClient = (pubClient as RedisClientType).duplicate() as RedisClientType;

      const connectWithTimeout = (client: RedisClientType) => {
        return Promise.race([
          client.connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 2000))
        ]);
      };

      await Promise.all([
        connectWithTimeout(pubClient), 
        connectWithTimeout(subClient)
      ]);

      this.adapterConstructor = createAdapter(pubClient as any, subClient as any);
      this.logger.log(`✅ Socket.IO Redis adapter connected: ${url}`);
    } catch (err: any) {
      if (isProd) {
        throw err; // Production: Redis is required for multi-instance WebSocket
      }
      // Development: fall back to in-memory adapter (single-process only)
      this.logger.warn(
        `⚠️  Redis unavailable (${err.message}). ` +
        `Socket.IO running with in-memory adapter — single process only. ` +
        `Start Redis to enable cross-instance pub/sub.`,
      );
      this.adapterConstructor = null;

      // Attempt graceful cleanup of any partially-connected clients
      try { pubClient?.disconnect(); } catch { /* ignore */ }
      try { subClient?.disconnect(); } catch { /* ignore */ }
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const corsOptions = {
      origin: this.configService.get('FRONTEND_URL') || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    };

    const serverOptions: Partial<ServerOptions> = {
      ...options,
      cors: corsOptions,
      path: options?.path || '/socket.io',
    };

    const server = super.createIOServer(port, serverOptions as ServerOptions);

    if (this.adapterConstructor) {
      // Redis adapter — enables cross-process WebSocket pub/sub
      server.adapter(this.adapterConstructor);
    } else {
      this.logger.warn(
        'Socket.IO using default in-memory adapter (Redis unavailable). ' +
        'WebSocket events will not be broadcast across multiple server instances.',
      );
    }

    return server;
  }
}
