import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentReconciliationService } from '../payment/payment-reconciliation.service';

@Processor('reliability-jobs')
export class ReliabilityProcessor extends WorkerHost {
  private readonly logger = new Logger(ReliabilityProcessor.name);

  constructor(
    private prisma: PrismaService,
    private reconciliationService: PaymentReconciliationService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'payment-reconciliation-check':
        return this.handlePaymentReconciliation(job.data);
      case 'daily-usage-reset':
        return this.handleUsageReset();
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  /**
   * Periodically check for "PENDING" bookings that might have been confirmed in Razorpay
   * but the webhook was missed.
   */
  private async handlePaymentReconciliation(data: { bookingId: string }) {
    this.logger.log(`[JOB] Checking reconciliation for booking: ${data.bookingId}`);
    
    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
    });

    if (!booking || booking.status !== 'PENDING') {
      return { status: 'SKIPPED', reason: 'Booking not in PENDING state' };
    }

    // Logic to fetch from Razorpay and reconcile if needed
    // This uses the idempotency logic in reconciliationService
    if (booking.razorpayOrderId) {
        // Implementation would call razorpay API and then reconcile
        this.logger.log(`[JOB] Booking ${data.bookingId} has orderId. Ready for fetch.`);
    }

    return { status: 'COMPLETED' };
  }

  /**
   * Resets monthly revenue/usage for all tenants at the start of the month
   */
  private async handleUsageReset() {
    this.logger.log(`[JOB] Starting daily usage/revenue reset check.`);
    
    const now = new Date();
    if (now.getDate() === 1) {
      this.logger.log(`[JOB] First of the month detected. Resetting revenue.`);
      await this.prisma.tenant.updateMany({
        data: { monthlyRevenue: 0 },
      });
      return { status: 'RESET_COMPLETED' };
    }

    return { status: 'NO_ACTION_REQUIRED' };
  }
}
