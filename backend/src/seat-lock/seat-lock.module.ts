import { Module } from '@nestjs/common';
import { SeatLockService } from './seat-lock.service';
import { SeatLockWorker } from './seat-lock.worker';

@Module({
  providers: [SeatLockService, SeatLockWorker],
  exports: [SeatLockService],
})
export class SeatLockModule {}
