import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { StructuredLogger } from '../common/logger/structured-logger.service';
import { PaymentService } from './payment.service';
import { RefundService } from './refund.service';
import { validateTransition } from '../booking/booking-state.machine';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReconciliationWorker {
  /**
   * CONCURRENCY GUARD — prevents overlapping reconciliation sweeps.
   *
   * ROOT CAUSE: Without this, a slow Razorpay API round-trip (e.g. 2–4s × 100 bookings
   * = up to 400s) causes the 5-minute @Cron to fire a SECOND time while the first
   * is still awaiting HTTP responses. Both runs then process the SAME stale bookings,
   * holding 2× DB connections and potentially creating duplicate ledger entries.
   */
  private isReconciling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLogger,
    private readonly paymentService: PaymentService,
    private readonly refundService: RefundService,
  ) {
    this.logger.setContext('ReconciliationWorker');
  }

  /**
   * Runs every 5 minutes to catch missed or out-of-order webhooks.
   * Finds bookings stuck in PAYMENT_IN_PROGRESS for more than 10 minutes.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleReconciliation() {
    if (this.isReconciling) {
      this.logger.warn('[Reconciliation] Previous sweep still running — skipping this cycle.');
      return;
    }

    // Memory diagnostic
    const mem = process.memoryUsage();
    this.logger.debug(
      `[ReconciliationWorker] Heap used: ${Math.round(mem.heapUsed / 1024 / 1024)} MB / ` +
      `${Math.round(mem.heapTotal / 1024 / 1024)} MB total`,
    );

    this.isReconciling = true;
    this.logger.log('Starting payment reconciliation worker...');

    // 10 minutes ago
    const cutoffDate = new Date(Date.now() - 10 * 60 * 1000);

    try {
      // ✅ HARD LIMIT: Never process more than 50 stale bookings per cycle.
      // Each booking triggers a Razorpay API call — 50 × ~2s = ~100s max per sweep.
      const staleBookings = await this.prisma.booking.findMany({
        where: {
          status: 'PAYMENT_IN_PROGRESS',
          createdAt: { lt: cutoffDate },
        },
        select: {
          id: true,
          orderId: true,
          razorpayOrderId: true,
          tenantId: true,
          finalAmount: true,
        },
        take: 50,              // Reduced from 100 for tighter cycle time control
        orderBy: { createdAt: 'asc' },
      });

      if (staleBookings.length === 0) {
        this.logger.log('No stale bookings found for reconciliation.');
        return;
      }

      this.logger.log(`Found ${staleBookings.length} stale bookings. Commencing reconciliation.`);

      for (const booking of staleBookings) {
        if (!booking.tenantId) continue;
        
        try {
          await this.reconcileBooking(booking.id, booking.razorpayOrderId, booking.tenantId, booking.finalAmount as any as Prisma.Decimal);
        } catch (error: any) {
          this.logger.error(`Reconciliation failed for booking ${booking.id}: ${error.message}`);
        }
      }
      
      // Also sweep for REFUND_INITIATED that missed the async trigger
      await this.sweepPendingRefunds();
    } catch (err: any) {
      this.logger.error(`[Reconciliation] Sweep failed: ${err.message}`);
    } finally {
      this.isReconciling = false; // ✅ Always release guard
    }
  }

  private async reconcileBooking(
bookingId: string, razorpayOrderId: string | null, tenantId: string, finalAmount: Prisma.Decimal) {
    if (!razorpayOrderId) {
      this.logger.warn(`Cannot reconcile booking ${bookingId} - missing Razorpay Order ID. Expiring it.`);
       // If no order ID, it never even initialized Razorpay properly.
       await this.prisma.booking.update({
           where: { id: bookingId },
           data: { status: 'FAILED' }
       });
       return;
    }

    // Attempt to fetch payments for the order from Razorpay API
    const rpInstance = (this.paymentService as any).razorpay;
    if (!rpInstance) throw new Error('Razorpay instance not initialized');

    let payments;
    try {
      payments = await rpInstance.orders.fetchPayments(razorpayOrderId);
    } catch(err: any) {
       this.logger.error(`Failed to fetch payments for order ${razorpayOrderId}: ${err.message}`);
       return;
    }

    const successfulPayment = payments?.items?.find((p: any) => p.status === 'captured');

    if (successfulPayment) {
      // It paid! We missed the webhook.
      const paymentId = successfulPayment.id;
      
      this.logger.log(`Found unrecorded successful payment ${paymentId} for booking ${bookingId}. Syncing.`);

      // Mandatory Guard: is it already in ledger?
      const existingLedger = await this.prisma.paymentLedger.findFirst({
        where: { razorpayId: paymentId, status: 'SUCCESS' }
      });

      if (existingLedger) {
        this.logger.warn(`Ledger already exists for payment ${paymentId}. Force syncing booking state only to avoid duplication.`);
        // Just sync booking state if it got messed up somehow
        await this.prisma.booking.update({
          where: { id: bookingId, status: 'PAYMENT_IN_PROGRESS' },
          data: { status: 'CONFIRMED' }
        });
        return;
      }

      // We proceed to lock & sync in a transaction
      await this.prisma.$transaction(async (tx) => {
         const bk = await tx.booking.findUnique({ where: { id: bookingId }});
         if (bk?.status === 'PAYMENT_IN_PROGRESS') {
             validateTransition(bk.status, 'CONFIRMED');
             await tx.booking.update({
                where: { id: bookingId },
                data: {
                  status: 'CONFIRMED',
                  razorpayPaymentId: paymentId,
                  paymentCapturedAt: new Date(),
                }
             });

             await tx.seatLock.updateMany({
                where: { bookingId, status: 'LOCKED' },
                data: { status: 'CONFIRMED' },
             });
             
             await tx.bookingSeat.updateMany({
                 where: { bookingId },
                 data: { status: 'CONFIRMED' },
             });

             await tx.paymentLedger.create({
               data: {
                 bookingId,
                 amount: Math.round(finalAmount.mul(100).toNumber()),
                 currency: 'INR',
                 type: 'PAYMENT',
                 razorpayId: paymentId,
                 status: 'SUCCESS',
                 tenantId,
               }
             });
             this.logger.log(`Recovered booking ${bookingId} to CONFIRMED.`);
         } else if (bk && ['EXPIRED', 'CANCELLED', 'FAILED'].includes(bk.status)) {
             // Paid but booking was dead. Must initiate refund.
             validateTransition(bk.status, 'REFUND_INITIATED');
             await tx.booking.update({
                where: { id: bookingId },
                data: {
                  status: 'REFUND_INITIATED',
                  razorpayPaymentId: paymentId,
                  paymentCapturedAt: new Date(),
                  refundInitiatedAt: new Date(),
                }
             });
             await tx.paymentLedger.createMany({
                data: [
                   { bookingId, amount: Math.round(finalAmount.mul(100).toNumber()), currency: 'INR', type: 'PAYMENT', razorpayId: paymentId, status: 'SUCCESS', tenantId },
                   { bookingId, amount: Math.round(finalAmount.mul(100).toNumber()), currency: 'INR', type: 'REFUND', razorpayId: paymentId, status: 'REFUND_INITIATED', tenantId }
                ]
             });
             this.logger.log(`Recovered late payment for dead booking ${bookingId}. Set to REFUND_INITIATED.`);
         }
      });
    } else {
       // Status check on Razorpay shows no successful payment (e.g. they abandoned auth, or it failed entirely).
       // We can safely fail/expire the booking.
       this.logger.log(`No successful payments found for booking ${bookingId} order ${razorpayOrderId}. Marking FAILED/EXPIRED.`);
       await this.prisma.$transaction(async (tx) => {
           const bk = await tx.booking.findUnique({ where: { id: bookingId }});
           if (bk?.status === 'PAYMENT_IN_PROGRESS') {
               validateTransition(bk.status, 'FAILED');
               await tx.booking.update({
                   where: { id: bookingId },
                   data: { status: 'FAILED' }
               });
               
               await tx.seatLock.updateMany({
                  where: { bookingId, status: 'LOCKED' },
                  data: { status: 'RELEASED' }
               });
           }
       });
    }
  }

  /**
   * Secondary task: Sweep bookings stuck in REFUND_INITIATED that might have missed their async refund trigger.
   * FIXED: Added take:50 limit to prevent unbounded memory usage.
   */
  private async sweepPendingRefunds() {
     const pendingRefunds = await this.prisma.booking.findMany({
         where: { status: 'REFUND_INITIATED' },
         select: { id: true, tenantId: true },
         take: 50,
         orderBy: { createdAt: 'asc' },     // Process oldest stuck refunds first

     });

     for (const { id: bookingId, tenantId } of pendingRefunds) {
       if (!tenantId) continue;
       try {
           // Rely on the idempotent nature of our RefundService + Razorpay refund API
           await this.refundService.processRefund(bookingId, tenantId, 0);
       } catch (err: any) {
           this.logger.error(`Worker failed to execute pending refund for booking ${bookingId}: ${err.message}`);
       }
     }
  }
}
