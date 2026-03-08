import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { FeatureService } from './feature.service';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { ReliabilityProcessor } from './reliability.processor';
import { BullModule } from '@nestjs/bullmq';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'reliability-jobs' }),
    PaymentModule,
  ],
  controllers: [PlatformController],
  providers: [
    PlatformService,
    FeatureService,
    AnomalyDetectionService,
    ReliabilityProcessor,
  ],
  exports: [PlatformService, FeatureService, AnomalyDetectionService],
})
export class PlatformModule {}
