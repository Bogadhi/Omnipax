import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { BaseAppException } from '../common/exceptions/base-app.exception';

@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger(PaymentReconciliationService.name);
  private readonly razorpay: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get('RAZORPAY_KEY_ID'),
      key_secret: this.configService.get('RAZORPAY_KEY_SECRET'),
    });
  }

  /**
   * Verified Razorpay signature for webhooks
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = this.configService.get('RAZORPAY_WEBHOOK_SECRET');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      this.logger.warn(`[RECONCILIATION] Signature mismatch detected.`);
      return false;
    }
    return true;
  }

  /**
   * Performs server-side verification with Razorpay API
   */
  async verifyPayment(paymentId: string, orderId: string, expectedAmount: number): Promise<boolean> {
    try {
      this.logger.log(`[RECONCILIATION] Verifying payment ${paymentId} via Razorpay API...`);
      const payment = await this.razorpay.payments.fetch(paymentId);

      const isValid = 
        payment.status === 'captured' &&
        payment.order_id === orderId &&
        Number(payment.amount) === (expectedAmount * 100); // Razorpay amounts are in paise

      if (!isValid) {
        this.logger.warn(`[RECONCILIATION] Payment ${paymentId} failed verification. status=${payment.status}, amount=${payment.amount}`);
      }

      return isValid;
    } catch (error: any) {
      this.logger.error(`[RECONCILIATION] Error fetching payment ${paymentId} from Razorpay`, error.stack);
      return false;
    }
  }

  /**
   * Atomically process payment log and confirm booking
   */
  async reconcileBooking(
    bookingId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    rawPayload: any,
    tenantId: string,
  ) {
    // Check for replay
    const existingLog = await this.prisma.paymentLog.findUnique({
      where: { razorpayPaymentId },
    });

    if (existingLog) {
      this.logger.warn(`[RECONCILIATION] Duplicate payment detected: ${razorpayPaymentId}. Ignoring.`);
      return;
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      this.logger.error(`[RECONCILIATION] Booking ${bookingId} not found.`);
      return;
    }

    const isVerified = await this.verifyPayment(
      razorpayPaymentId,
      razorpayOrderId,
      Number(booking.finalAmount),
    );

    // Atomic transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.paymentLog.create({
        data: {
          bookingId,
          razorpayOrderId,
          razorpayPaymentId,
          verified: isVerified,
          amount: Number(booking.finalAmount),
          status: isVerified ? 'VERIFIED' : 'MISMATCH',
          rawPayload,
          tenantId,
        },
      });

      if (isVerified) {
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: 'CONFIRMED',
            razorpayPaymentId,
            paymentCapturedAt: new Date(),
          },
        });

        // Update tenant revenue
        await tx.tenant.update({
          where: { id: tenantId },
          data: {
            monthlyRevenue: { increment: booking.finalAmount },
          },
        });
        
        this.logger.log(`[RECONCILIATION] Booking ${bookingId} confirmed and revenue updated.`);
      } else {
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: 'FAILED' },
        });
        this.logger.error(`[RECONCILIATION] Booking ${bookingId} marked as FAILED due to verification mismatch.`);
      }
    });
  }
}
