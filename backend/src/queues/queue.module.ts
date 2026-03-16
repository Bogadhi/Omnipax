import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { getRedisConnectionFromUrl } from './redis-connection.util';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: getRedisConnectionFromUrl(
          configService.getOrThrow<string>('REDIS_URL'),
        ),
      }),
    }),
    BullModule.registerQueue(
      { name: 'seat-lock-expiry' },
      { name: 'booking-expiry' },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
