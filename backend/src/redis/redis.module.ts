import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RedisModule');

        const redisUrl = configService.get<string>('REDIS_URL');

        if (!redisUrl) {
          logger.warn('⚠️ REDIS_URL not provided. Redis features disabled.');
          return null;
        }

        try {
          const client = new Redis(redisUrl, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          });

          client.on('connect', () => {
            logger.log('✅ Redis connected');
          });

          client.on('error', (err: Error) => {
            logger.error(`Redis error: ${err.message}`);
          });

          return client;
        } catch (error) {
          logger.error('❌ Failed to initialize Redis');
          return null;
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}