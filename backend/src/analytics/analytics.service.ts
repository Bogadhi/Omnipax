import {
  Injectable,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, Prisma } from '@prisma/client';
import { Response } from 'express';
import { Readable } from 'stream';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  private getUtcDateBoundaries(from?: string, to?: string) {
    const filter: any = {};
    if (from) {
      filter.gte = new Date(from);
    }
    if (to) {
      filter.lte = new Date(to);
    }
    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  async getTheaterRevenueSummary(tenantId: string, from?: string, to?: string) {
    const startTime = Date.now();
    const dateFilter = this.getUtcDateBoundaries(from, to);

    const ledgerEntries = await this.prisma.paymentLedger.findMany({
      where: {
        tenantId,
        status: 'SUCCESS',
        createdAt: dateFilter,
      },
      select: {
        type: true,
        amount: true,
      },
    });

    let totalRevenueCents = 0;
    let totalRefundsCents = 0;

    for (const entry of ledgerEntries) {
      if (entry.type === 'PAYMENT') totalRevenueCents += entry.amount;
      if (entry.type === 'REFUND') totalRefundsCents += entry.amount;
    }
    const netRevenueCents = totalRevenueCents - totalRefundsCents;

    const bookings = await this.prisma.booking.groupBy({
      by: ['status'],
      where: {
        tenantId,
        createdAt: dateFilter,
      },
      _count: {
        id: true,
      },
    });

    let confirmedCount = 0;
    const confirmedStatuses: string[] = [
      BookingStatus.CONFIRMED,
      BookingStatus.REFUND_INITIATED,
      BookingStatus.REFUNDED,
      BookingStatus.REFUND_FAILED,
    ];

    for (const group of bookings) {
      if (confirmedStatuses.includes(group.status)) {
        confirmedCount += group._count.id;
      }
    }

    const totalInitiations = bookings.reduce((sum, g) => sum + g._count.id, 0);
    const conversionRate =
      totalInitiations > 0 ? confirmedCount / totalInitiations : 0;
    const averageTicketValue =
      confirmedCount > 0 ? totalRevenueCents / confirmedCount : 0;

    this.logger.debug(
      `getTheaterRevenueSummary query took ${Date.now() - startTime}ms`,
    );

    return {
      totalRevenue: totalRevenueCents,
      totalRefunds: totalRefundsCents,
      netRevenue: netRevenueCents,
      totalBookings: confirmedCount,
      conversionRate,
      averageTicketValue,
      refundRate: totalRevenueCents > 0 ? totalRefundsCents / totalRevenueCents : 0,
    };
  }

  async getDailyRevenueTimeSeries(tenantId: string, from?: string, to?: string) {
    const dateFilter = this.getUtcDateBoundaries(from, to);

    const revenueByDay = await this.prisma.booking.groupBy({
      by: ['createdAt'],
      where: {
        tenantId,
        status: BookingStatus.CONFIRMED,
        createdAt: dateFilter,
      },
      _sum: {
        totalAmount: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const dailyMap = new Map<string, number>();
    for (const b of revenueByDay) {
      const dateKey = b.createdAt.toISOString().split('T')[0];
      const amount = b._sum.totalAmount ? Number(b._sum.totalAmount) : 0;
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + amount);
    }

    return Array.from(dailyMap.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));
  }

  async getShowAnalytics(showId: string, tenantId: string) {
    const startTime = Date.now();

    const show = await this.prisma.show.findFirst({
      where: { id: showId, event: { tenantId } },
      select: { id: true, totalCapacity: true, price: true },
    });

    if (!show) {
      throw new ForbiddenException('Show not found or unauthorized');
    }

    const seatCountResult = await this.prisma.bookingSeat.aggregate({
      where: {
        booking: {
          showId: showId,
          tenantId: tenantId,
          status: BookingStatus.CONFIRMED,
        },
      },
      _count: {
        id: true,
      },
    });

    const safeCapacity = show.totalCapacity || 0;
    const seatsSold = seatCountResult._count.id;
    const occupancyRate = safeCapacity > 0 ? (seatsSold / safeCapacity) * 100 : 0;

    const revenueQuery = await this.prisma.$queryRaw<
      { revenue_sum: bigint; refund_sum: bigint }[]
    >`
      SELECT 
        SUM(CASE WHEN l.type = 'PAYMENT' THEN l.amount ELSE 0 END) as revenue_sum,
        SUM(CASE WHEN l.type = 'REFUND' THEN l.amount ELSE 0 END) as refund_sum
      FROM "PaymentLedger" l
      INNER JOIN "Booking" b ON b.id = l."bookingId"
      WHERE b."showId" = ${showId}
        AND b."tenantId" = ${tenantId}
        AND l.status = 'SUCCESS'
    `;

    const revSum = revenueQuery[0]?.revenue_sum
      ? Number(revenueQuery[0].revenue_sum)
      : 0;
    const refSum = revenueQuery[0]?.refund_sum
      ? Number(revenueQuery[0].refund_sum)
      : 0;

    this.logger.debug(`getShowAnalytics query took ${Date.now() - startTime}ms`);

    return {
      seatsSold,
      occupancyRate,
      revenue: revSum,
      refunds: refSum,
      netRevenue: revSum - refSum,
    };
  }

  async getSettlementAnalytics(tenantId: string, from?: string, to?: string) {
    const dateFilter = this.getUtcDateBoundaries(from, to);

    const summary = await this.prisma.booking.aggregate({
      where: {
        tenantId,
        status: BookingStatus.CONFIRMED,
        createdAt: dateFilter,
      },
      _sum: {
        ticketAmount: true,
        platformFeeAmount: true,
        refundAmount: true,
      },
      _count: true,
    });

    const ticketTotal = summary._sum.ticketAmount || new Prisma.Decimal(0);
    const refundTotal = summary._sum.refundAmount || new Prisma.Decimal(0);
    const platformRevenue =
      summary._sum.platformFeeAmount || new Prisma.Decimal(0);

    const grossRevenue = ticketTotal.minus(refundTotal);
    const theaterNetPayable = grossRevenue.minus(platformRevenue);

    return {
      grossRevenue,
      platformRevenue,
      theaterNetPayable,
      totalRefunds: refundTotal,
      confirmedBookings: summary._count || 0,
      period: { from, to },
    };
  }

  async getPlatformSummary(userRole: string, from?: string, to?: string) {
    if (userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Only SUPER_ADMIN can access platform summaries',
      );
    }

    const startTime = Date.now();
    const dateFilter = this.getUtcDateBoundaries(from, to);

    const globalLedger = await this.prisma.paymentLedger.groupBy({
      by: ['type'],
      where: {
        status: 'SUCCESS',
        createdAt: dateFilter,
      },
      _sum: { amount: true },
    });

    let globalRevenue = 0;
    let globalRefunds = 0;
    for (const group of globalLedger) {
      if (group.type === 'PAYMENT') globalRevenue = group._sum.amount ? Number(group._sum.amount) : 0;
      if (group.type === 'REFUND') globalRefunds = group._sum.amount ? Number(group._sum.amount) : 0;
    }

    const totalPlatformRevenue = globalRevenue - globalRefunds;

    const totalBookings = await this.prisma.booking.count({
      where: {
        status: {
          in: [
            BookingStatus.CONFIRMED,
            BookingStatus.REFUNDED,
            BookingStatus.REFUND_INITIATED,
            BookingStatus.REFUND_FAILED,
          ],
        },
        createdAt: dateFilter,
      },
    });

    const activeTheaters = await this.prisma.tenant.count({
      where: { createdAt: dateFilter },
    });

    this.logger.debug(`getPlatformSummary query took ${Date.now() - startTime}ms`);

    return {
      globalRevenue,
      globalRefunds,
      netPlatformRevenue: totalPlatformRevenue,
      totalBookings,
      activeTheaters,
      period: { from, to },
    };
  }

  async getBookingFunnelMetrics(tenantId: string, from?: string, to?: string) {
    const startTime = Date.now();
    const dateFilter = this.getUtcDateBoundaries(from, to);

    const metrics = await this.prisma.booking.groupBy({
      by: ['status'],
      where: {
        tenantId,
        createdAt: dateFilter,
      },
      _count: { id: true },
    });

    let totalInitiations = 0;
    let totalLocks = 0;
    let paymentInitiated = 0;
    let confirmed = 0;
    let expired = 0;
    let refunded = 0;

    const refundedStatuses: string[] = [
      BookingStatus.REFUNDED,
      BookingStatus.REFUND_INITIATED,
      BookingStatus.REFUND_FAILED,
    ];

    for (const m of metrics) {
      const count = m._count.id;
      totalInitiations += count;
      if (m.status === BookingStatus.LOCKED) totalLocks += count;
      if (m.status === BookingStatus.PAYMENT_IN_PROGRESS) paymentInitiated += count;
      if (m.status === BookingStatus.CONFIRMED) confirmed += count;
      if (m.status === BookingStatus.EXPIRED) expired += count;
      if (refundedStatuses.includes(m.status)) {
        refunded += count;
      }
    }

    const conversionRate = totalInitiations > 0 ? confirmed / totalInitiations : 0;

    this.logger.debug(
      `getBookingFunnelMetrics query took ${Date.now() - startTime}ms`,
    );

    return {
      totalInitiations,
      totalLocks,
      paymentInitiated,
      confirmed,
      expired,
      refunded,
      conversionRate,
    };
  }

  async exportRevenueCsvStream(
    tenantId: string,
    res: Response,
    from?: string,
    to?: string,
  ) {
    const dateFilter = this.getUtcDateBoundaries(from, to);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=analytics-${tenantId}-${Date.now()}.csv`,
    );

    const header = 'BookingID,UserID,ShowID,Amount,Status,CreatedAt\n';
    const stream = new Readable({
      read() {},
    });
    stream.push(header);
    stream.pipe(res);

    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        createdAt: dateFilter,
      },
      select: {
        id: true,
        userId: true,
        showId: true,
        totalAmount: true,
        status: true,
        createdAt: true,
      },
    });

    for (const b of bookings) {
      const row = `${b.id},${b.userId},${b.showId},${b.totalAmount},${b.status},${b.createdAt.toISOString()}\n`;
      stream.push(row);
    }

    stream.push(null);
  }
}
