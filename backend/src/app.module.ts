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

import { HealthModule } from './health/health.module';
import { BullModule } from '@nestjs/bullmq';
import { AuditModule } from './audit/audit.module';
import { MetricsModule } from './metrics/metrics.module';
import { LoggerModule } from './common/logger/logger.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { ValidationModule } from './validation/validation.module';
import { WishlistModule } from './wishlist/wishlist.module';

import { MetricsController } from './metrics/metrics.controller';

import { RoleGuard } from './common/guards/role.guard';
import { PlanGuard } from './platform/guards/plan.guard';
import { FeatureGuard } from './platform/guards/feature.guard';

import { ShowModule } from './show/show.module';
import { DiscountModule } from './discount/discount.module';
import { SeatLockModule } from './seat-lock/seat-lock.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { TicketsModule } from './tickets/tickets.module';
import { DevicesModule } from './devices/devices.module';
import { TheaterOnboardingModule } from './theater-onboarding/theater-onboarding.module';
import { PlatformModule } from './platform/platform.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ScheduleModule.forRoot(),

    /*
    ===============================
    BULLMQ (QUEUE SYSTEM)
    ===============================
    */

    BullModule.forRootAsync({
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {

    const redisUrl = config.get<string>('UPSTASH_REDIS_REST_URL');
    const redisToken = config.get<string>('UPSTASH_REDIS_REST_TOKEN');

    const host = config.get<string>('REDIS_HOST') || '127.0.0.1';
    const port = Number(config.get('REDIS_PORT')) || 6379;

    if (redisUrl && redisToken) {
      return {
        connection: {
          host: redisUrl.replace('https://', '').replace('http://', ''),
          port: 443,
          password: redisToken,
          tls: {},
          maxRetriesPerRequest: null,
        },
      };
    }

    return {
      connection: {
        host,
        port,
        maxRetriesPerRequest: null,
      },
    };
  },
}),

    /*
    ===============================
    CACHE MODULE
    ===============================
    */

    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {

        const redisUrl = config.get<string>('UPSTASH_REDIS_REST_URL');
        const redisToken = config.get<string>('UPSTASH_REDIS_REST_TOKEN');

        const host = config.get<string>('REDIS_HOST');
        const port = config.get<number>('REDIS_PORT');

        if (redisUrl && redisToken) {
          return {
            store: redisStore as any,
            url: redisUrl,
            password: redisToken,
            ttl: 60,
          };
        }

        if (host && port) {
          return {
            store: redisStore as any,
            url: `redis://${host}:${port}`,
            ttl: 60,
          };
        }

        return { ttl: 60 };
      },
    }),

    /*
    ===============================
    RATE LIMITING
    ===============================
    */

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {

        const redisUrl = config.get<string>('UPSTASH_REDIS_REST_URL');
        const redisToken = config.get<string>('UPSTASH_REDIS_REST_TOKEN');

        const limit = config.get('NODE_ENV') === 'production' ? 20 : 1000;

        if (redisUrl && redisToken) {
          return {
            throttlers: [
              { ttl: 60000, limit },
              { ttl: 3600000, limit: limit * 10 },
            ],
            storage: new ThrottlerStorageRedisService(
              new Redis(redisUrl, { password: redisToken }),
            ),
          };
        }

        return {
          throttlers: [
            { ttl: 60000, limit },
            { ttl: 3600000, limit: limit * 10 },
          ],
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

    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: RoleGuard },
    { provide: APP_GUARD, useClass: PlanGuard },
    { provide: APP_GUARD, useClass: FeatureGuard },

    { provide: APP_INTERCEPTOR, useClass: PrismaRetryInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
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