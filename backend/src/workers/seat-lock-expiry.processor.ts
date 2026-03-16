import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';

@Processor('seat-lock-expiry')
@Injectable()
export class SeatLockExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(SeatLockExpiryProcessor.name);

  async process(job: Job<any>): Promise<void> {
    this.logger.log(`Processing seat lock expiry job: ${job.id}`);

    // TODO: release locked seats here
  }
}