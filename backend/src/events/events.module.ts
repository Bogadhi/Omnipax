import { Module } from '@nestjs/common';
import { SeatLocksModule } from '../seat-locks/seat-locks.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [SeatLocksModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
