import { Module } from '@nestjs/common';
import { QueueModule } from '../queues/queue.module';
import { SeatLocksModule } from '../seat-locks/seat-locks.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [QueueModule, SeatLocksModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
