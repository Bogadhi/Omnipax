import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BookingsService } from '../bookings/bookings.service';

@Processor('booking-expiry')
export class BookingExpiryProcessor extends WorkerHost {
  constructor(private readonly bookingsService: BookingsService) {
    super();
  }

  async process(job: Job<{ bookingId: string }>) {
    if (job.name !== 'expire') {
      return;
    }
    await this.bookingsService.expirePendingBooking(job.data.bookingId);
  }
}
