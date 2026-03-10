import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export class RedisIoAdapter extends IoAdapter {

  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(private app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(): Promise<void> {

    const redisUrl =
      process.env.REDIS_URL ||
      `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

    console.log('--- [DEBUG] Attempting Redis connection ---');

    const pubClient = createClient({
      url: redisUrl,
    });

    const subClient = pubClient.duplicate();

    await pubClient.connect();
    await subClient.connect();

    console.log('--- [DEBUG] Redis adapter connected ---');

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: any) {

    const server = super.createIOServer(port, options);

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }
}