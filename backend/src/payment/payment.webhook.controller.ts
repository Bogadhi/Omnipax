import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { BookingService } from '../booking/booking.service';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../common/logger/structured-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentProcessorService } from './payment-processor.service';
import { RefundService } from './refund.service';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';

@Controller('payment/webhook')
export class PaymentWebhookController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly bookingService: BookingService,
    private readonly configService: ConfigService,
    private readonly logger: StructuredLogger,
    private readonly prisma: PrismaService,
    private readonly paymentProcessorService: PaymentProcessorService,
    private readonly refundService: RefundService,
  ) {
    this.logger.setContext('PaymentWebhook');
  }

  /**
   * Secondary webhook endpoint at /payment/webhook (legacy path).
   * The primary handler is at /payments/webhook (PaymentController).
   * Both use the same rawBody capture from main.ts.
   */
  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: any,
  ) {
    // rawBody is captured as a string by the bodyParser.json verify callback
    const rawBody: string | undefined = req.rawBody;

    if (!rawBody) {
      this.logger.warn('Raw body missing — falling back to serialized body');
    }

    const bodyForVerification = rawBody ?? JSON.stringify(req.body);

    const secret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(bodyForVerification)
      .digest('hex');

    if (expected !== signature) {
      this.logger.error('Invalid webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    const event = req.body;
    const paymentEntity = event.payload?.payment?.entity;

    if (!paymentEntity) {
      return { status: 'ignored' };
    }

    let bookingId: string | undefined = paymentEntity.notes?.bookingId;

    if (!bookingId && paymentEntity.order_id) {
      const booking = await (this.paymentService as any).prisma?.booking?.findFirst({
        where: { razorpayOrderId: paymentEntity.order_id },
        select: { id: true },
      });
      bookingId = booking?.id;
    }

    if (!bookingId) {
      this.logger.warn('Webhook received without resolvable bookingId');
      return { status: 'ignored_no_booking_id' };
    }

    switch (event.event) {
      case 'payment.captured':
        try {
          await this.prisma.$transaction(async (tx) => {
            // 🎯 [UPGRADE] Step 2B: Hard idempotency constraint using dedicated table
            try {
              await tx.razorpayWebhookEvent.create({
                data: { eventId: event.id || paymentEntity.id },
              });
            } catch (e: any) {
              if (e.code === 'P2002') {
                this.logger.log(`Idempotency: Event ${event.id} already processed.`);
                return { status: 'ok' };
              }
              throw e;
            }

            // 🎯 [UPGRADE] Step 2B: Ensure internal PaymentEvent tracking is atomic
            const rzpTenantId = paymentEntity.notes?.tenantId;
            if (!rzpTenantId) {
              throw new BadRequestException('Missing tenantId in notes');
            }

            const paymentEvent = await tx.paymentEvent.create({
              data: {
                razorpayEventId: event.id || paymentEntity.id,
                bookingId,
                eventType: event.event,
                payload: event as Prisma.JsonObject,
                tenantId: rzpTenantId,
              },
            });

            // Process payload via service
            // Note: Since we are in a transaction, the service should ideally use 'tx'
            // but we maintain compatibility with the current processor.
            await this.paymentProcessorService.processPaymentSuccess(
              bookingId,
              paymentEntity.id,
              signature,
              rzpTenantId,
            );

            await tx.paymentEvent.update({
              where: { id: paymentEvent.id },
              data: { processed: true },
            });
          });

          this.logger.log(`✅ Webhook processed successfully: ${bookingId}`);
        } catch (err: any) {
          // 🎯 [UPGRADE] Step 2C: DeadLetterEvent handling for failed processing
          this.logger.error(`Webhook processing failed: ${err.message}`);
          
          await this.prisma.deadLetterEvent.create({
            data: {
              type: event.event,
              payload: event as Prisma.JsonObject,
              reason: err.message,
              bookingId,
              razorpayEventId: event.id,
              tenantId: paymentEntity.notes?.tenantId || 'UNKNOWN',
            },
          });

          throw err;
        }
        break;

      case 'payment.failed':
        this.logger.warn(`Payment failed for booking ${bookingId}`);
        break;

      case 'refund.processed': {
        // Resolve booking by refund entity's payment_id
        const refundEntity = event.payload?.refund?.entity;
        const refundId: string = refundEntity?.id;
        const refundPaymentId: string = refundEntity?.payment_id;

        const bkByRefund = refundPaymentId
          ? await this.prisma.booking.findFirst({
              where: { razorpayPaymentId: refundPaymentId },
              select: { id: true, status: true },
            })
          : null;

        if (!bkByRefund) {
          this.logger.warn(`refund.processed: cannot resolve booking for paymentId=${refundPaymentId}`);
          break;
        }

        // Webhook safety guard: only update if still in REFUND_INITIATED
        if (bkByRefund.status !== 'REFUND_INITIATED') {
          this.logger.warn(`refund.processed replay ignored — booking ${bkByRefund.id} is already ${bkByRefund.status}`);
          await this.prisma.systemEventLog.create({
            data: {
              eventType: 'WEBHOOK_REPLAY',
              entityId: bkByRefund.id,
              metadata: { event: 'refund.processed', currentStatus: bkByRefund.status },
            },
          });
          break;
        }

        await this.prisma.booking.update({
          where: { id: bkByRefund.id },
          data: {
            status: 'REFUNDED' as any,
            refundedAt: new Date(),
            razorpayRefundId: refundId,
          },
        });

        await this.prisma.systemEventLog.create({
          data: {
            eventType: 'REFUND_COMPLETED',
            entityId: bkByRefund.id,
            metadata: { refundId, razorpayPaymentId: refundPaymentId },
          },
        });

        this.logger.log(`✅ Booking ${bkByRefund.id} marked REFUNDED via webhook`);
        break;
      }

      case 'refund.failed': {
        const refundEntity = event.payload?.refund?.entity;
        const refundPaymentId: string = refundEntity?.payment_id;

        const bkByRefundFailed = refundPaymentId
          ? await this.prisma.booking.findFirst({
              where: { razorpayPaymentId: refundPaymentId },
              select: { id: true, status: true },
            })
          : null;

        if (!bkByRefundFailed) {
          this.logger.warn(`refund.failed: cannot resolve booking for paymentId=${refundPaymentId}`);
          break;
        }

        await this.prisma.booking.update({
          where: { id: bkByRefundFailed.id },
          data: { status: 'REFUND_FAILED' as any },
        });

        await this.prisma.systemEventLog.create({
          data: {
            eventType: 'REFUND_FAILED',
            entityId: bkByRefundFailed.id,
            metadata: { razorpayPaymentId: refundPaymentId, errorCode: refundEntity?.error_code },
          },
        });

        this.logger.error(`❌ Refund failed for booking ${bkByRefundFailed.id}`);
        break;
      }

      default:
        this.logger.log(`Unhandled webhook event: ${event.event}`);
    }

    return { status: 'ok' };
  }
}
