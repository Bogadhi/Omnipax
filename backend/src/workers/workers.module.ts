import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { SeatLocksModule } from '../seat-locks/seat-locks.module';
import { BookingExpiryProcessor } from './booking-expiry.processor';
import { SeatLockExpiryProcessor } from './seat-lock-expiry.processor';

@Module({
  imports: [SeatLocksModule, BookingsModule],
  providers: [SeatLockExpiryProcessor, BookingExpiryProcessor],
})
export class WorkersModule {}
