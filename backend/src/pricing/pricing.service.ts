import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SeatStatus } from '@prisma/client';

@Injectable()
export class PricingService {
  private readonly fixedFee: number;
  private readonly percentageFee: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.fixedFee = parseFloat(
      this.configService.get<string>('FIXED_FEE', '19.99'),
    );
    this.percentageFee =
      parseFloat(this.configService.get<string>('SERVICE_PERCENTAGE', '2')) /
      100;
  }

  async getDynamicPrices(showId: string) {
    const show = await this.prisma.show.findUnique({
      where: { id: showId },
      include: { screen: true },
    });

    if (!show) {
      throw new NotFoundException('Show not found');
    }

    const totalSeats = show.screen
      ? show.screen.totalRows * show.screen.seatsPerRow
      : 0;

    const occupiedCount = await this.prisma.seatAvailability.count({
      where: {
        showId,
        status: { in: [SeatStatus.LOCKED, SeatStatus.BOOKED] },
      },
    });

    const demandRatio = totalSeats > 0 ? occupiedCount / totalSeats : 0;

    const now = new Date();
    const startTime = new Date(show.startTime);
    const hoursRemaining =
      (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    let timeFactor = 0;
    if (hoursRemaining < 2) {
      timeFactor = 0.5;
    } else if (hoursRemaining < 24) {
      timeFactor = 0.2;
    } else if (hoursRemaining < 48) {
      timeFactor = 0.1;
    }

    const demandFactor = demandRatio > 0.8 ? 0.3 : demandRatio > 0.5 ? 0.1 : 0;

    return {
      showId,
      basePrice: show.price,
      finalPrice: Math.round(show.price * (1 + demandFactor + timeFactor)),
      factors: {
        demandRatio,
        demandFactor,
        hoursRemaining,
        timeFactor,
      },
    };
  }

  /**
   * Unified Pricing Engine Logic
   *
   * BaseTotal     = basePrice × quantity
   * ConvenienceFee = ₹19.99 × quantity   (per seat, NOT per transaction)
   * ServiceFee    = 2% × BaseTotal       (NOT on convenienceFee)
   * Total         = BaseTotal + ConvenienceFee + ServiceFee
   */
  calculateTotal(
    arg: { basePrice: number; quantity: number } | number,
    seatCount?: number,
  ): {
    baseTotal: number;
    convenienceFee: number;
    serviceFee: number;
    total: number;
    // Legacy keys kept for compatibility with existing callers
    baseAmount: number;
    totalAmount: number;
    breakdown: any;
  } {
    // Support both calling conventions:
    //   calculateTotal({ basePrice, quantity })
    //   calculateTotal(price, seatCount)   ← legacy positional form
    const basePrice = typeof arg === 'object' ? arg.basePrice : arg;
    const quantity = typeof arg === 'object' ? arg.quantity : (seatCount ?? 1);

    const baseTotal = basePrice * quantity;
    const convenienceFee = this.fixedFee * quantity; // per seat
    const serviceFee = baseTotal * this.percentageFee; // 2% of base only

    const total = Number((baseTotal + convenienceFee + serviceFee).toFixed(2));

    return {
      // New canonical keys
      baseTotal,
      convenienceFee: Number(convenienceFee.toFixed(2)),
      serviceFee: Number(serviceFee.toFixed(2)),
      total,
      // Legacy aliases so existing callers don't break
      baseAmount: baseTotal,
      totalAmount: total,
      breakdown: {
        base: baseTotal,
        convenience: Number(convenienceFee.toFixed(2)),
        service: Number(serviceFee.toFixed(2)),
      },
    };
  }

  /**
   * Legacy wrapper — kept for backward compatibility.
   */
  calculatePricing(showBasePrice: number, seatCount: number): any {
    const res = this.calculateTotal(showBasePrice, seatCount);
    return {
      base: res.baseTotal,
      fixedFee: this.fixedFee,
      percentageFee: res.serviceFee,
      fees: res.convenienceFee + res.serviceFee,
      total: res.total,
    };
  }
}
