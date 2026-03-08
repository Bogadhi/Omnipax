import { Module } from '@nestjs/common';
import { ShowController } from './show.controller';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [BookingModule],
  controllers: [ShowController],
})
export class ShowModule {}
