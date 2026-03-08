import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StructuredLogger } from '../common/logger/structured-logger.service';
import { PaymentService } from './payment.service';
import { validateTransition } from '../booking/booking-state.machine';
import { Prisma } from '@prisma/client';

@Injectable()
export class RefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLogger,
    private readonly paymentService: PaymentService, // Needed for Razorpay instance
  ) {
    this.logger.setContext('RefundService');
  }

  /**
   * Process a refund with external API (Razorpay), then record in DB.
   * This MUST NOT be called within an active DB transaction.
   */
  async processRefund(bookingId: string, tenantId: string, retryCount = 0): Promise<boolean> {
    this.logger.log(`Processing refund for booking ${bookingId} (Retry: ${retryCount})`);

    // 1. Fetch booking details (No transaction)
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking || booking.tenantId !== tenantId) {
      this.logger.error(`Refund failed: Booking ${bookingId} not found or tenant mismatch`);
      return false;
    }

    if (!booking.razorpayPaymentId) {
       this.logger.error(`Refund failed: Booking ${bookingId} has no razorpayPaymentId`);
       return false;
    }

    // Double check state
    if (booking.status !== 'REFUND_INITIATED') {
       this.logger.warn(`Skipping refund for booking ${bookingId} - not in REFUND_INITIATED state (is ${booking.status})`);
       return false;
    }

    const amountInPaise = Math.round(new Prisma.Decimal(booking.finalAmount || booking.totalAmount).mul(100).toNumber());

    // 2. Call Razorpay API (External I/O, potential latency/failure)
    let refundResult: any;
    try {
      // NOTE: Expecting razorpay instance to be available on paymentService
      const rpInstance = (this.paymentService as any).razorpay;
      if (!rpInstance) {
          throw new Error('Razorpay instance not initialized in PaymentService');
      }

      refundResult = await rpInstance.payments.refund(booking.razorpayPaymentId, {
        amount: amountInPaise,
        speed: 'optimum',
        notes: {
          bookingId: booking.id,
          tenantId: booking.tenantId,
        }
      });
      
      this.logger.log(`Razorpay refund successful for booking ${bookingId}. Refund ID: ${refundResult.id}`);

    } catch (error: any) {
      this.logger.error(`Razorpay API refund failed for booking ${bookingId}: ${error.message}`);
      
      // Handle Failure: Append fail ledger, update state to REFUND_FAILED, record dead letter
      await this.handleRefundFailure(bookingId, booking.razorpayPaymentId, tenantId, amountInPaise, error, retryCount);
      return false;
    }

    // 3. Handle Success: Append ledger, update state, resolve.
    try {
        await this.prisma.$transaction(async (tx) => {
            // Re-fetch to ensure no concurrent updates
             const latestBk = await tx.booking.findUnique({ where: { id: bookingId }});
             if (latestBk?.status !== 'REFUND_INITIATED') {
                 // Already processed by webhook? Write success ledger anyway, but don't transition
                 this.logger.warn(`Refund succeeded in Razorpay but DB state is ${latestBk?.status}. Appending ledger only.`);
             } else {
                 validateTransition(latestBk.status, 'REFUNDED');
                 await tx.booking.update({
                     where: { id: bookingId },
                     data: {
                         status: 'REFUNDED',
                         razorpayRefundId: refundResult.id,
                         refundCompletedAt: new Date(),
                         refundedAt: new Date(), // back-compat
                     }
                 });
             }

             // Append Immutable Ledger Entry
             await tx.paymentLedger.create({
                 data: {
                    bookingId,
                    amount: amountInPaise,
                    currency: 'INR',
                    type: 'REFUND',
                    razorpayId: refundResult.id || booking.razorpayPaymentId,
                    status: 'SUCCESS',
                    tenantId,
                 }
             });
        });
        
        return true;
    } catch (dbError: any) {
         this.logger.error(`Database failure after successful Razorpay refund for ${bookingId}. Action required.`);
         // Extremely rare: API succeeds, DB fails. Needs manual intervention or DeadLetter
          await this.prisma.deadLetterEvent.create({
            data: {
              type: 'REFUND_SYNC_FAILED',
              payload: { refundResult } as Prisma.JsonObject,
              reason: dbError.message,
              bookingId,
              razorpayEventId: booking.razorpayPaymentId,
              tenantId,
              retryCount,
            }
          });
         return false;
    }
  }

  private async handleRefundFailure(
      bookingId: string, 
      paymentId: string, 
      tenantId: string, 
      amount: number, 
      error: any,
      retryCount: number
  ) {
      await this.prisma.$transaction(async (tx) => {
          const bk = await tx.booking.findUnique({ where: { id: bookingId }});
          
          if (bk?.status === 'REFUND_INITIATED') {
               validateTransition(bk.status, 'REFUND_FAILED');
               await tx.booking.update({
                   where: { id: bookingId },
                   data: { status: 'REFUND_FAILED' }
               });
          }

          // Append Failure Ledger
          await tx.paymentLedger.create({
               data: {
                  bookingId,
                  amount,
                  currency: 'INR',
                  type: 'REFUND',
                  razorpayId: paymentId,
                  status: 'FAILED',
                 tenantId,
               }
          });

          // Store Context in Dead Letter Queue for Retries
          await tx.deadLetterEvent.create({
              data: {
                  type: 'REFUND_API_FAILED',
                  payload: { errorMsg: error.message, stack: error.stack } as Prisma.JsonObject,
                  reason: 'External API Call Failed',
                  bookingId,
                  razorpayEventId: paymentId,
                  tenantId,
                  retryCount: retryCount + 1, // increment retry counter for next attempt
              }
          });
      });
  }
}
