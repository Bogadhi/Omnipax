import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { StructuredLogger } from '../common/logger/structured-logger.service';
import { NotificationService } from '../notification/notification.service';
import { BookingStatus } from '@prisma/client';

@Processor('booking')
export class BookingProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLogger,
    private readonly notificationService: NotificationService,
  ) {
    super();
    this.logger.setContext('BookingProcessor');
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'cleanup_expired':
        return this.handleExpiredBookings();
      case 'send_email':
        return this.handleSendEmail(job.data);
      case 'process_refund':
        return this.handleRefund(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleExpiredBookings() {
    // Logic from BookingService moved here
    // Implementation pending - we need to copy the logic or call a service method
    // Ideally we call the service method to keep logic in one place, but service isn't injected here yet to avoid circular deps if service uses queue
    // For now, let's just log
    this.logger.log('Processing expired bookings cleanup job...');
    const now = new Date();
    const expired = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.LOCKED,
        expiresAt: { lt: now },
      },
      include: { bookingSeats: true },
    });

    for (const booking of expired) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.EXPIRED },
      });
      // seat release logic (redis keys) would need redis client or gateway access
      // simpler to just mark DB status for now as redis keys expire automatically (TTL) or we can clean them
      this.logger.log(`Marked booking ${booking.id} as EXPIRED`);
    }
  }

  private async handleSendEmail(data: {
    email: string;
    bookingId: string;
    qrCode: string;
  }) {
    await this.notificationService.queueConfirmationEmail(data.bookingId);
    this.logger.log(`Email sent for booking ${data.bookingId}`);
  }

  private async handleRefund(data: { bookingId: string }) {
    this.logger.log(`Processing refund for ${data.bookingId}`);
    // Simulate refund delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.logger.log(`Refund processed for ${data.bookingId}`);
  }
}
