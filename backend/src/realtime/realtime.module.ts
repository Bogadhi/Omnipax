import { Global, Module } from '@nestjs/common';
import { SeatUpdatesGateway } from './seat-updates.gateway';

@Global()
@Module({
  providers: [SeatUpdatesGateway],
  exports: [SeatUpdatesGateway],
})
export class RealtimeModule {}
