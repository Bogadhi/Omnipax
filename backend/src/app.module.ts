import {
  Module,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { RedisModule } from './redis/redis.module';
import { EventModule } from './event/event.module';
import { BookingModule } from './booking/booking.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationModule } from './notification/notification.module';
import { PricingModule } from './pricing/pricing.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { DebugLoggerMiddleware } from './common/middleware/debug-logger.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { PrismaRetryInterceptor } from './common/interceptors/prisma-retry.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import * as net from 'net';

/** Synchronous-safe Redis probe reused across AppModule factories. */
function probeRedisSync(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const s = new net.Socket();
    const done = (v: boolean) => { s.destroy(); resolve(v); };
    s.setTimeout(timeoutMs);
    s.once('connect', () => done(true));
    s.once('timeout', () => done(false));
    s.once('error', () => done(false));
    s.connect(port, host);
  });
}

import { HealthModule } from './health/health.module';
import { BullModule } from '@nestjs/bullmq';
import { AuditModule } from './audit/audit.module';
import { MetricsModule } from './metrics/metrics.module';
import { LoggerModule } from './common/logger/logger.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { ValidationModule } from './validation/validation.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { MetricsController } from './metrics/metrics.controller';

/* ✅ NEW IMPORT */
import { RoleGuard } from './common/guards/role.guard';
import { ShowModule } from './show/show.module';
import { DiscountModule } from './discount/discount.module';
import { SeatLockModule } from './seat-lock/seat-lock.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { TicketsModule } from './tickets/tickets.module';
import { DevicesModule } from './devices/devices.module';
import { TheaterOnboardingModule } from './theater-onboarding/theater-onboarding.module';
import { PlatformModule } from './platform/platform.module';
import { PlanGuard } from './platform/guards/plan.guard';
import { FeatureGuard } from './platform/guards/feature.guard';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ScheduleModule.forRoot(),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const host   = config.get<string>('REDIS_HOST') || '127.0.0.1';
        const port   = Number(config.get('REDIS_PORT')) || 6379;
        const isDev  = config.get('NODE_ENV') !== 'production';
        const redisUp = await probeRedisSync(host, port);

        return {
          connection: {
            host,
            port,
            maxRetriesPerRequest: null,
            enableOfflineQueue: false,
            lazyConnect: true,
            // KEY FIX: retryStrategy: () => null tells ioredis "never reconnect".
            // Without this, BullMQ's internal ioredis floods the terminal with
            // ECONNREFUSED errors on every reconnect attempt (every ~100ms).
            // When Redis IS available, use exponential backoff so queues recover
            // automatically if Redis restarts mid-run.
            retryStrategy: (redisUp || !isDev)
              ? (times: number) => Math.min(times * 500, 5000)
              : () => null,
          },
        };
      },
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const host = config.get<string>('REDIS_HOST') || '127.0.0.1';
        const port = config.get<number>('REDIS_PORT') || 6379;
        const isProd = config.get('NODE_ENV') === 'production';
        const redisUp = await probeRedisSync(host, port);

        if (!redisUp) {
          if (isProd) throw new Error('[CacheModule] Redis unavailable in production.');
          // Dev fallback: in-memory cache (no store option = memory)
          return { ttl: 60 };
        }
        return {
          store: redisStore as any,
          url: `redis://${host}:${port}`,
          ttl: 60,
        };
      },
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const isDev = config.get('NODE_ENV') === 'development' || !config.get('NODE_ENV');
        const limit = isDev ? 1000 : 20;
        const host = config.get<string>('REDIS_HOST') || '127.0.0.1';
        const port = config.get<number>('REDIS_PORT') || 6379;
        const redisUp = !isDev || await probeRedisSync(host, port);

        const throttleBase = {
          throttlers: [
            { ttl: 60000, limit },
            { ttl: 3600000, limit: limit * 10 },
          ],
        };

        if (!redisUp) {
          // Dev fallback: in-memory throttle storage (no storage key = default)
          return throttleBase;
        }

        return {
          ...throttleBase,
          storage: new ThrottlerStorageRedisService(
            new Redis({ host, port }),
          ),
        };
      },
    }),

    PrismaModule,
    AuthModule,
    AdminModule,
    WebsocketModule,
    RedisModule,
    EventModule,
    BookingModule,

    /* ✅ NEW MODULE ADDED */
    ShowModule,
    SeatLockModule,

    PaymentModule,
    NotificationModule,
    PricingModule,
    HealthModule,
    AuditModule,
    MetricsModule,
    LoggerModule,
    RecommendationModule,
    ValidationModule,
    WishlistModule,
    DiscountModule,
    AnalyticsModule,
    TicketsModule,
    DevicesModule,
    TheaterOnboardingModule,
    PlatformModule,
  ],

  controllers: [AppController, MetricsController],

  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PlanGuard,
    },
    {
      provide: APP_GUARD,
      useClass: FeatureGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PrismaRetryInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(DebugLoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    consumer
      .apply(RequestIdMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: '/', method: RequestMethod.GET },
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/otp/request', method: RequestMethod.POST },
        { path: 'auth/health', method: RequestMethod.GET },
        { path: 'health', method: RequestMethod.GET },
        'auth/(.*)',
      )
      .forRoutes('*');
  }
}
