import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { BookingExpiryService } from './booking-expiry.service';
import { BookingGateway } from '../websocket/booking.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { PricingModule } from '../pricing/pricing.module';
import { NotificationModule } from '../notification/notification.module';
import { PaymentModule } from '../payment/payment.module';
import { AdminModule } from '../admin/admin.module';
import { SystemEventService } from '../common/system-event.service';
import { SeatLockModule } from '../seat-lock/seat-lock.module';
import { LoggerModule } from '../common/logger/logger.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    PricingModule,

    forwardRef(() => NotificationModule),
    forwardRef(() => PaymentModule),
    forwardRef(() => AdminModule),

    BullModule.registerQueue({
      name: 'booking',
    }),

    SeatLockModule,
    LoggerModule,
  ],
  controllers: [BookingController],
  providers: [
    BookingService,
    BookingGateway,
    SystemEventService,
    // ✅ Registered here so @Cron() decorators fire.
    // Was previously defined but not provided — crons never ran.
    BookingExpiryService,
  ],
  exports: [BookingService, BookingGateway, SystemEventService],
})
export class BookingModule {}
