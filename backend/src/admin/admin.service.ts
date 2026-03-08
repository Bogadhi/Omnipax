import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';
import { BookingStatus, EventType, PlatformFeeType, SeatStatus } from '@prisma/client';
import { UpdateMonetizationDto } from './dto/monetization.dto';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private redis: Redis | null,
  ) {}

  async updateMonetization(
    tenantId: string,
    dto: UpdateMonetizationDto,
    changedByUserId: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    if (dto.type === PlatformFeeType.PERCENTAGE && dto.value && dto.value > 20) {
      throw new BadRequestException('Percentage fee cannot exceed 20%');
    }
    if (dto.type === PlatformFeeType.FLAT && dto.value && dto.value > 1000) {
      throw new BadRequestException('Flat fee cannot exceed ₹1000');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.monetizationAudit.create({
        data: {
          tenantId,
          oldFeeType: tenant.platformFeeType,
          oldPercentage: tenant.platformFeeType === PlatformFeeType.PERCENTAGE ? tenant.platformFeeValue : null,
          oldFlatFee: tenant.platformFeeType === PlatformFeeType.FLAT ? tenant.platformFeeValue : null,
          newFeeType: dto.type ?? tenant.platformFeeType,
          newPercentage: (dto.type ?? tenant.platformFeeType) === PlatformFeeType.PERCENTAGE ? dto.value ?? tenant.platformFeeValue : null,
          newFlatFee: (dto.type ?? tenant.platformFeeType) === PlatformFeeType.FLAT ? dto.value ?? tenant.platformFeeValue : null,
          changedByUserId,
        },
      });
      return tx.tenant.update({
        where: { id: tenantId },
        data: { platformFeeEnabled: dto.enabled, platformFeeType: dto.type, platformFeeValue: dto.value },
      });
    });
  }

  /**
   * Returns summary stats for the admin dashboard.
   * Called by GET /admin/stats and GET /admin/analytics/overview.
   * Returns `pendingActions` (not refundQueue) to match the frontend field name.
   */
  async getAnalyticsOverview(tenantId?: string) {
    console.log('[DEBUG] getAnalyticsOverview started for tenant:', tenantId);
    try {
      const tenantFilter = tenantId ? { tenantId } : {};

      console.log('[DEBUG] Executing Prisma aggregations...');
      const [totalRevenue, totalBookings, activeUsers, pendingActions] = await Promise.all([
        this.prisma.booking.aggregate({
          where: { status: BookingStatus.CONFIRMED, ...tenantFilter },
          _sum: { totalAmount: true },
        }),
        this.prisma.booking.count({ where: { status: BookingStatus.CONFIRMED, ...tenantFilter } }),
        tenantId
          ? this.prisma.user.count({ where: { tenantId } })
          : this.prisma.user.count(),
        this.prisma.booking.count({
          where: { status: { in: [BookingStatus.CANCELLED, BookingStatus.FAILED] }, ...tenantFilter },
        }),
      ]);
      console.log('[DEBUG] Prisma aggregations complete');

      let activeLocks = 0;
      if (this.redis) {
        console.log('[DEBUG] Executing Redis scanStream...');
        const stream = this.redis.scanStream({ match: 'seat_lock:*:*', count: 100 });
        for await (const batch of stream) {
          activeLocks += (batch as string[]).length;
        }
        console.log('[DEBUG] Redis scanStream complete. activeLocks:', activeLocks);
      }

      return {
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        totalBookings,
        activeUsers,
        activeLocks,
        pendingActions,
      };
    } catch (error) {
      console.error('[DEBUG] getAnalyticsOverview CRASHED:', error);
      throw error;
    }
  }

  // ─── Events ──────────────────────────────────────────────────────────────

  async getAllEvents(tenantId?: string) {
    return this.prisma.event.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { date: 'desc' },
      take: 100,
    });
  }

  async createEvent(dto: CreateEventDto, tenantId: string) {
    return this.prisma.event.create({
      data: {
        title: dto.title,
        type: dto.type as EventType,
        language: dto.language,
        duration: dto.duration,
        date: new Date(dto.date),
        location: dto.location,
        price: dto.price,
        totalSeats: dto.totalSeats,
        availableSeats: dto.totalSeats,
        posterUrl: dto.posterUrl,
        bannerUrl: dto.bannerUrl,
        description: dto.description,
        isActive: true,
        tenantId,
      },
    });
  }

  // ─── Bookings ─────────────────────────────────────────────────────────────

  async getBookings(status?: string) {
    const statusFilter = status
      ? { status: { in: status.split(',') as BookingStatus[] } }
      : {};

    return this.prisma.booking.findMany({
      where: statusFilter,
      include: {
        user: true,
        show: {
          include: {
            event: true,
            screen: { include: { theater: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ─── Shows ────────────────────────────────────────────────────────────────

  async getShows(
    limit = 10,
    cursor?: string,
    filters?: { search?: string; startDate?: string; endDate?: string },
  ) {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { event: { title: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    if (filters?.startDate || filters?.endDate) {
      where.startTime = {};
      if (filters.startDate) where.startTime.gte = new Date(filters.startDate);
      if (filters.endDate) where.startTime.lte = new Date(filters.endDate);
    }

    const shows = await this.prisma.show.findMany({
      where,
      include: { event: true, screen: { include: { theater: true } } },
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { startTime: 'asc' },
    });

    // Return { shows, total } shape — matches frontend GetShowsResponse type
    return { shows, total: shows.length };
  }

  async createShow(eventId: string, screenId: string, startTime: Date, price: number, tenantId: string) {
    const screen = await this.prisma.screen.findUnique({
      where: { id: screenId },
      include: { seats: true },
    });
    if (!screen) throw new NotFoundException('Screen not found');

    return this.prisma.$transaction(async (tx) => {
      const show = await tx.show.create({
        data: {
          eventId,
          screenId,
          startTime,
          price,
          totalCapacity: screen.seats.length,
          remainingCapacity: screen.seats.length,
          tenantId,
          isActive: true,
        },
      });

      if (screen.seats.length > 0) {
        await tx.seatAvailability.createMany({
          data: screen.seats.map((seat) => ({
            showId: show.id,
            seatId: seat.id,
            status: SeatStatus.AVAILABLE,
            tenantId,
          })),
        });
      }

      return show;
    });
  }

  // ─── Theaters ─────────────────────────────────────────────────────────────

  async getTheaters() {
    return this.prisma.theater.findMany({ include: { screens: true } });
  }

  async getScreens(theaterId: string) {
    return this.prisma.screen.findMany({ where: { theaterId } });
  }
}
