import { Module } from '@nestjs/common';
import { QueueModule } from '../queues/queue.module';
import { SeatLocksController } from './seat-locks.controller';
import { SeatLocksService } from './seat-locks.service';

@Module({
  imports: [QueueModule],
  controllers: [SeatLocksController],
  providers: [SeatLocksService],
  exports: [SeatLocksService],
})
export class SeatLocksModule {}
