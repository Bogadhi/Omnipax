import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, DiscountType, Prisma } from '@prisma/client';

export interface DiscountBreakdown {
  totalAmount: number;
  couponDiscountAmount: number;
  giftCardDiscountAmount: number;
  discountAmount: number;
  finalAmount: number;
  couponCode?: string;
  giftCardCode?: string;
}

@Injectable()
export class DiscountService {
  private readonly logger = new Logger(DiscountService.name);

  constructor(private prisma: PrismaService) {}

  async applyDiscounts({
    bookingId,
    couponCode,
    giftCardCode,
  }: {
    bookingId: string;
    couponCode?: string;
    giftCardCode?: string;
  }): Promise<DiscountBreakdown> {
    // ────────────────────────────────────────────
    // 1. Fetch & Guard the booking
    // ────────────────────────────────────────────
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.LOCKED) {
      throw new BadRequestException(
        `Discounts can only be applied to a LOCKED booking (current: ${booking.status})`,
      );
    }

    // Reject if Razorpay order already created (orderCreatedAt acts as lock)
    if ((booking as any).orderCreatedAt || (booking as any).razorpayOrderId) {
      throw new BadRequestException(
        'Cannot modify discounts after a payment order has been created',
      );
    }

    // Double-apply guard
    if (couponCode && (booking as any).couponId) {
      throw new BadRequestException(
        'A coupon has already been applied to this booking',
      );
    }
    if (giftCardCode && (booking as any).giftCardId) {
      throw new BadRequestException(
        'A gift card has already been applied to this booking',
      );
    }

    let runningTotal = new Prisma.Decimal(booking.totalAmount);
    let couponDiscountAmount = new Prisma.Decimal(0);
    let giftCardDiscountAmount = new Prisma.Decimal(0);
    let couponId: string | undefined;
    let giftCardId: string | undefined;

    // ────────────────────────────────────────────
    // 2. Coupon Validation & Calculation
    // ────────────────────────────────────────────
    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: couponCode },
      });

      if (!coupon) {
        throw new BadRequestException(`Coupon "${couponCode}" not found`);
      }
      if (!coupon.isActive) {
        throw new BadRequestException(`Coupon "${couponCode}" is not active`);
      }
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw new BadRequestException(`Coupon "${couponCode}" has expired`);
      }
      if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
        throw new BadRequestException(
          `Coupon "${couponCode}" has reached its usage limit`,
        );
      }
      if ((booking.totalAmount as any).lt(coupon.minOrderAmount)) {
        throw new BadRequestException(
          `Order total ₹${booking.totalAmount.toString()} is below the minimum ₹${coupon.minOrderAmount} required for this coupon`,
        );
      }

      if (coupon.discountType === DiscountType.PERCENTAGE) {
        const raw = booking.totalAmount.mul(coupon.discountValue).div(100);
        couponDiscountAmount =
          coupon.maxDiscount !== null
            ? Prisma.Decimal.min(raw, coupon.maxDiscount)
            : raw;
      } else {
        couponDiscountAmount = Prisma.Decimal.min(coupon.discountValue, runningTotal);
      }

      couponDiscountAmount = couponDiscountAmount.toDecimalPlaces(2);
      runningTotal = runningTotal.sub(couponDiscountAmount);
      couponId = coupon.id;

      this.logger.log(
        `Coupon "${couponCode}" applied: -₹${couponDiscountAmount.toString()}`,
      );
    }

    // ────────────────────────────────────────────
    // 3. Gift Card Validation & Deduction
    // ────────────────────────────────────────────
    if (giftCardCode) {
      const giftCard = await this.prisma.giftCard.findUnique({
        where: { code: giftCardCode },
      });

      if (!giftCard) {
        throw new BadRequestException(
          `Gift card "${giftCardCode}" not found`,
        );
      }
      if (!giftCard.isActive) {
        throw new BadRequestException(
          `Gift card "${giftCardCode}" is not active`,
        );
      }
      if (giftCard.expiresAt && giftCard.expiresAt < new Date()) {
        throw new BadRequestException(
          `Gift card "${giftCardCode}" has expired`,
        );
      }
      if (giftCard.balance <= 0) {
        throw new BadRequestException(
          `Gift card "${giftCardCode}" has no remaining balance`,
        );
      }

      // Deduct only what's needed — never more than remaining balance or running total
      giftCardDiscountAmount = Prisma.Decimal.min(giftCard.balance, runningTotal).toDecimalPlaces(2);
      runningTotal = runningTotal.sub(giftCardDiscountAmount);
      giftCardId = giftCard.id;

      this.logger.log(
        `Gift card "${giftCardCode}" applied: -₹${giftCardDiscountAmount.toString()}`,
      );
    }

    // ────────────────────────────────────────────
    // 4. Compute final amounts — no negatives
    // ────────────────────────────────────────────
    const discountAmount = couponDiscountAmount.add(giftCardDiscountAmount).toDecimalPlaces(2);
    const finalAmount = Prisma.Decimal.max(0, runningTotal).toDecimalPlaces(2);

    // ────────────────────────────────────────────
    // 5. Persist atomically
    // ────────────────────────────────────────────
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        couponDiscountAmount,
        giftCardDiscountAmount,
        discountAmount,
        finalAmount,
        ...(couponId ? { couponId } : {}),
        ...(giftCardId ? { giftCardId } : {}),
      } as any,
    });

    this.logger.log(
      `Booking ${bookingId}: totalAmount=₹${booking.totalAmount.toString()} → discountAmount=₹${discountAmount.toString()} → finalAmount=₹${finalAmount.toString()}`,
    );

    return {
      totalAmount: booking.totalAmount.toNumber(),
      couponDiscountAmount: couponDiscountAmount.toNumber(),
      giftCardDiscountAmount: giftCardDiscountAmount.toNumber(),
      discountAmount: discountAmount.toNumber(),
      finalAmount: finalAmount.toNumber(),
      ...(couponCode ? { couponCode } : {}),
      ...(giftCardCode ? { giftCardCode } : {}),
    };
  }
}
