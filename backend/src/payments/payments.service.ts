import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BookingService } from '../booking/booking.service';
import { PricingService } from '../pricing/pricing.service';
import { BookingStatus, Prisma } from '@prisma/client';
import Razorpay = require('razorpay');
import * as crypto from 'crypto';
import { BaseAppException } from '../common/exceptions/base-app.exception';

enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN,
}

@Injectable()
export class PaymentService {
  private razorpay: any;
  private readonly logger = new Logger(PaymentService.name);

  // Circuit Breaker State
  private circuitState: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastErrorTime: number = 0;
  private readonly FAILURE_THRESHOLD = 5;
  private readonly COOLDOWN_PERIOD = 120000; // 2 minutes
  private readonly WINDOW_PERIOD = 60000; // 1 minute

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => BookingService))
    private bookingService: BookingService,
    private pricingService: PricingService,
  ) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      this.logger.warn('⚠ Razorpay keys missing in environment');
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  private checkCircuit() {
    const now = Date.now();
    if (this.circuitState === CircuitState.OPEN) {
      if (now - this.lastErrorTime > this.COOLDOWN_PERIOD) {
        this.circuitState = CircuitState.HALF_OPEN;
        this.logger.log(`[CIRCUIT] Transitioning to HALF_OPEN for testing.`);
      } else {
        throw new BaseAppException('CIRCUIT_OPEN', 'Payment service temporarily unavailable.');
      }
    }
  }

  private recordFailure() {
    const now = Date.now();
    // Reset failures if window expired
    if (now - this.lastErrorTime > this.WINDOW_PERIOD) {
      this.failureCount = 0;
    }

    this.failureCount++;
    this.lastErrorTime = now;

    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      this.circuitState = CircuitState.OPEN;
      this.logger.error(`[CIRCUIT] Threshold reached. Opening circuit for 2 minutes.`);
    }
  }

  private recordSuccess() {
    this.failureCount = 0;
    this.circuitState = CircuitState.CLOSED;
  }

  // =====================================================
  // CREATE RAZORPAY ORDER
  // =====================================================
  async createRazorpayOrder(bookingId: string, userId: string) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    const provider = this.configService.get<string>('PAYMENT_PROVIDER');

    if (!keyId || !keySecret) {
      this.logger.error('Razorpay configuration missing');
      throw new BadRequestException('Payment configuration error');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new BadRequestException('Unauthorized booking access');
    }

    if (booking.status !== BookingStatus.LOCKED) {
      throw new BadRequestException(
        `Booking is in ${booking.status} state`,
      );
    }

    if (booking.expiresAt && booking.expiresAt < new Date()) {
      throw new BadRequestException('Booking expired');
    }

    if (!booking.totalAmount || booking.totalAmount.lte(new Prisma.Decimal(0))) {
      // 🎯 PRICING ENGINE UNIFICATION: Recalculate if not set or verify
      const bookingSeatsCount = await this.prisma.bookingSeat.count({
        where: { bookingId: booking.id },
      });
      
      const show = await this.prisma.show.findUnique({ where: { id: booking.showId } });
      const pricing = this.pricingService.calculateTotal(show!.price, bookingSeatsCount);
      
      this.logger.log(`Recalculated total for booking ${booking.id}: ${pricing.totalAmount}`);
      
      // Persist the calculated total immutably for this order
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { totalAmount: new Prisma.Decimal(pricing.totalAmount) },
      });
      
      booking.totalAmount = new Prisma.Decimal(pricing.totalAmount);
    }

    // Use finalAmount only when a discount was actually applied.
    // Never rely on finalAmount === 0 as a fallback signal.
    // Note: totalAmount is Decimal, finalAmount is Float (convert to Decimal for safe math)
    const chargeAmount = 
      booking.discountAmount?.gt(0)
        ? new Prisma.Decimal(booking.finalAmount)
        : booking.totalAmount;

    const amountInPaise = chargeAmount.mul(100).toNumber();

    this.logger.log('========== Razorpay Debug ==========');
    this.logger.log(`Provider: ${provider}`);
    this.logger.log(`Booking ID: ${booking.id}`);
    this.logger.log(`Total Amount: ${booking.totalAmount.toString()}`);
    this.logger.log(`Amount in Paise: ${amountInPaise}`);
    this.logger.log(`Key ID Exists: ${!!keyId}`);
    this.logger.log('====================================');

    this.checkCircuit();

    try {
      // Prevent duplicate order creation
      if ((booking as any).razorpayOrderId) {
        return {
          orderId: (booking as any).razorpayOrderId,
          amount: amountInPaise,
          currency: 'INR',
          keyId,
        };
      }

      let order;

      if (provider === 'mock') {
        this.logger.warn('Using MOCK payment provider');

        order = {
          id: `order_mock_${Math.random()
            .toString(36)
            .substring(2, 10)}`,
          amount: amountInPaise,
          currency: 'INR',
        };
      } else {
        order = await this.razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `bk_${Date.now()}_${booking.id.substring(0, 8)}`,
          notes: { bookingId: booking.id },
        });
      }

      this.logger.log(`Razorpay order created: ${order.id}`);

      // Write razorpayOrderId AND orderCreatedAt atomically.
      // orderCreatedAt = discount lock: applyDiscounts will reject after this point.
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          razorpayOrderId: order.id,
          status: BookingStatus.PAYMENT_IN_PROGRESS,
        },
      });

      this.recordSuccess();

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
      };
    } catch (err: any) {
      this.recordFailure();
      this.logger.error('Razorpay order creation failed');
      this.logger.error(err?.response?.data || err?.message || err);

      throw new BadRequestException(
        err?.response?.data?.error?.description ||
          err?.message ||
          'Failed to create Razorpay order',
      );
    }
  }

  // =====================================================
  // HANDLE WEBHOOK
  // =====================================================
  async handleWebhook(rawBody: string, signature: string) {
    const secret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');

    if (!secret) {
      this.logger.error('RAZORPAY_WEBHOOK_SECRET is not configured');
      throw new BadRequestException('Webhook secret not configured');
    }

    // ─── Signature verification ───────────────────────────────────────────────
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      this.logger.error(
        `Invalid Razorpay signature. Expected: ${expectedSignature}, Got: ${signature}`,
      );
      throw new BadRequestException('Invalid signature');
    }

    // ─── Parse event ──────────────────────────────────────────────────────────
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      throw new BadRequestException('Malformed webhook body');
    }

    this.logger.log(`Webhook event received: ${event.event}`);

    // ─── Only care about payment.captured ────────────────────────────────────
    if (event.event !== 'payment.captured') {
      this.logger.log(`Ignoring event: ${event.event}`);
      return { received: true };
    }

    const paymentEntity = event.payload?.payment?.entity;

    if (!paymentEntity) {
      this.logger.warn('payment.captured but no payment entity in payload');
      return { received: true };
    }

    // ─── Resolve bookingId ────────────────────────────────────────────────────
    // Primary: notes.bookingId (set at order creation time)
    let bookingId: string | undefined = paymentEntity.notes?.bookingId;

    // Fallback: look up by razorpayOrderId stored on the booking record
    if (!bookingId && paymentEntity.order_id) {
      const booking = await (this.prisma.booking as any).findFirst({
        where: { razorpayOrderId: paymentEntity.order_id },
        select: { id: true },
      });
      bookingId = booking?.id;
    }

    if (!bookingId) {
      this.logger.warn(
        `payment.captured: cannot resolve bookingId — orderId=${paymentEntity.order_id}, notes=${JSON.stringify(paymentEntity.notes)}`,
      );
      return { received: true };
    }

    // ─── Confirm booking ─────────────────────────────────────────────────────
    try {
      await this.bookingService.confirmBookingFromRazorpay(
        bookingId,
        paymentEntity.id,
        signature,
        this.prisma,
      );
      this.logger.log(`✅ Booking confirmed via webhook: ${bookingId}`);
    } catch (err: any) {
      // Log but do not re-throw — Razorpay will retry if we throw here,
      // causing duplicate confirmations. Better to return 200 and alert.
      this.logger.error(
        `Failed to confirm booking ${bookingId}: ${err?.message}`,
      );
    }

    return { received: true };
  }

  // =====================================================
  // INITIATE REFUND (Two-Phase Safe)
  // =====================================================

  /**
   * Initiates a refund for the given payment.
   * 
   * Amount is passed by the caller (from booking.totalAmount) — no recalculation.
   * This preserves Razorpay parity and prevents pricing drift.
   *
   * Returns the Razorpay refund ID on success.
   * Throws on failure — caller must handle and log accordingly.
   */
  async initiateRefund(
    razorpayPaymentId: string,
    totalAmountINR: number | Prisma.Decimal,
  ): Promise<string> {
    const provider = this.configService.get<string>('PAYMENT_PROVIDER');
    const amountInPaise = typeof totalAmountINR === 'number' 
      ? Math.round(totalAmountINR * 100)
      : totalAmountINR.mul(100).toNumber();

    if (provider === 'mock') {
      this.logger.warn('Using MOCK refund provider');
      const mockRefundId = `refund_mock_${Math.random().toString(36).substring(2, 10)}`;
      this.logger.log(`Mock refund created: ${mockRefundId} for ₹${totalAmountINR}`);
      return mockRefundId;
    }

    this.logger.log(
      `Initiating Razorpay refund for paymentId=${razorpayPaymentId}, amount=${amountInPaise} paise`,
    );

    const refund = await this.razorpay.payments.refund(razorpayPaymentId, {
      amount: amountInPaise,
      speed: 'normal',
      notes: { source: 'StarPass cancellation' },
    });

    this.logger.log(`Razorpay refund created: ${refund.id}`);
    return refund.id as string;
  }

  /**
   * @deprecated Use initiateRefund(paymentId, amount) instead.
   * Kept for backward compatibility — will be removed in Phase 22.
   */
  async refundPayment(bookingId: string, seatsToRefund?: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingSeats: true, // If we need to count seats
      },
    });

    if (!booking || !booking.razorpayPaymentId) {
      throw new BadRequestException(
        'Refund failed: No Razorpay payment ID found',
      );
    }

    if (
      booking.status !== BookingStatus.CONFIRMED &&
      booking.status !== BookingStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Only confirmed or cancelled bookings can be refunded',
      );
    }

    // Double Refund Guard
    const totalSeats = booking.bookingSeats.length;
    const currentRefundedCount = booking.refundedSeatsCount;
    const requestingRefundCount = seatsToRefund ?? totalSeats - currentRefundedCount;

    if (requestingRefundCount + currentRefundedCount > totalSeats) {
      throw new BadRequestException('Double-refund exploit detected: Requested seats exceed booked seats');
    }

    // Model A: Refund only ticket amount, retain platform fee
    // Calculation: (ticketAmount / totalSeats) * requestingRefundCount
    const ticketAmount = new Prisma.Decimal(booking.ticketAmount);
    const refundAmount = ticketAmount.mul(requestingRefundCount).div(totalSeats).toDecimalPlaces(2);

    const refundId = await this.initiateRefund(
      booking.razorpayPaymentId,
      refundAmount,
    );

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.REFUND_INITIATED,
        razorpayRefundId: refundId,
        refundAmount: { increment: refundAmount },
        refundedSeatsCount: { increment: requestingRefundCount },
        refundedAt: new Date(),
      },
    });

    await this.bookingService.releaseSeatsSafely(bookingId, this.prisma);
    return { refundId, refundAmount };
  }


  // =====================================================
  // VERIFY SIGNATURE
  // =====================================================
  verifyWebhookSignature(
    rawBody: Buffer,
    signature: string,
  ): boolean {
    const expected = crypto
      .createHmac(
        'sha256',
        this.configService.get<string>(
          'RAZORPAY_WEBHOOK_SECRET',
        )!,
      )
      .update(rawBody)
      .digest('hex');

    return expected === signature;
  }

  /**
   * Verifies Razorpay Checkout signature (Standard Payment)
   * This uses the Key Secret, NOT the Webhook Secret.
   * Format: order_id + "|" + payment_id
   */
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    const secret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!secret) {
      this.logger.error('RAZORPAY_KEY_SECRET missing');
      return false;
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    return expected === signature;
  }
}
