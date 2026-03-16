import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, Prisma } from '@prisma/client';
import { validateTransition } from '../booking/booking-state.machine';

@Injectable()
export class PaymentProcessorService {
  private readonly logger = new Logger(PaymentProcessorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Processes a successful payment from a webhook.
   * This is the final stage of the booking flow.
   * Atomic transaction to ensure seat/booking consistency.
   */
  async processPaymentSuccess(
    bookingId: string,
    razorpayPaymentId: string,
    signature: string,
    tenantId: string,
  ) {
    this.logger.log(`Processing async payment success for booking ${bookingId}`);

    let requiresRefund = false;
    let successfulBookingId: string | null = null;
    let successfulShowId: string | null = null;
    let successfulTenantId: string | null = null;

    await this.prisma.$transaction(async (tx) => {
      // 1. Lock booking for update to prevent concurrent processing
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking || booking.tenantId !== tenantId) {
        throw new Error(`Booking ${bookingId} not found or tenant mismatch`);
      }

      // 2. Check current status
      if (booking.status === 'PAYMENT_IN_PROGRESS' || booking.status === 'LOCKED') {
        // Happy path: confirm booking and create payment ledger entry
        // Note: Accepting LOCKED as well for resilience if status update was missed
        
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: 'CONFIRMED',
            razorpayPaymentId,
            razorpaySignature: signature,
            paymentCapturedAt: new Date(),
          },
        });

        // Update seat locks
        await tx.seatLock.updateMany({
          where: { bookingId, status: 'LOCKED' },
          data: { status: 'CONFIRMED' },
        });

        // Update booking seats
        await tx.bookingSeat.updateMany({
           where: { bookingId },
           data: { status: 'CONFIRMED' },
        });

        // Insert append-only ledger entry
        // amount is in paise/cents. Using new Prisma.Decimal to ensure precision.
        const ledgerAmount = Math.round(
          new Prisma.Decimal(booking.finalAmount || booking.totalAmount)
            .mul(100)
            .toNumber()
        );

        await tx.paymentLedger.create({
          data: {
            bookingId,
            amount: ledgerAmount,
            currency: 'INR',
            type: 'PAYMENT',
            razorpayId: razorpayPaymentId,
            status: 'SUCCESS',
            tenantId,
          },
        });

        this.logger.log(`Booking ${bookingId} confirmed successfully via async webhook.`);
        successfulBookingId = bookingId;
        successfulShowId = booking.showId;
        successfulTenantId = tenantId;
      } else if (booking.status === 'EXPIRED') {
        // Edge case: payment success for expired booking. Must refund.
        this.logger.warn(`Payment success for EXPIRED booking ${bookingId}. Flagging for refund.`);
        requiresRefund = true;

        // Insert append-only ledger entries: Payment Success followed by Refund Initiated
        const ledgerAmount = Math.round(
          new Prisma.Decimal(booking.finalAmount || booking.totalAmount)
            .mul(100)
            .toNumber()
        );

        await tx.paymentLedger.createMany({
          data: [
            {
              bookingId,
              amount: ledgerAmount,
              currency: 'INR',
              type: 'PAYMENT',
              razorpayId: razorpayPaymentId,
              status: 'SUCCESS',
              tenantId,
            },
            {
              bookingId,
              amount: ledgerAmount,
              currency: 'INR',
              type: 'REFUND',
              razorpayId: razorpayPaymentId,
              status: 'REFUND_INITIATED',
              tenantId,
            },
          ],
        });
      } else if (booking.status === 'CONFIRMED') {
        this.logger.log(`Booking ${bookingId} already confirmed. Ignoring duplicate webhook.`);
      } else {
        this.logger.error(`Unexpected booking status ${booking.status} for payment success on ${bookingId}`);
      }
    });

    return { 
      requiresRefund, 
      successfulBookingId, 
      successfulShowId, 
      successfulTenantId 
    };
  }
}
