import { Module, Global } from '@nestjs/common';
import { BookingGateway } from './booking.gateway';
import { LoggerModule } from '../common/logger/logger.module';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [BookingGateway],
  exports: [BookingGateway],
})
export class WebsocketModule {}
