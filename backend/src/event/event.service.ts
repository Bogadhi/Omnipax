import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, page?: number, limit?: number) {
    const currentPage = Number(page) || 1;
    const take = Number(limit) || 10;
    const skip = (currentPage - 1) * take;

    // PAGINATED VERSION
    if (page && limit) {
      const [events, total] = await Promise.all([
        this.prisma.event.findMany({
          where: { tenantId, isActive: true },
          skip,
          take,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            shows: {
              orderBy: {
                startTime: 'asc', // ✅ FIXED
              },
              include: {
                screen: {
                  include: {
                    theater: true,
                  },
                },
                seatAvailability: {
                  include: { seat: true },
                  orderBy: [
                    { seat: { row: 'asc' } },
                    { seat: { number: 'asc' } },
                  ],
                },
              },
            },
          },
        }),
        this.prisma.event.count({
          where: { tenantId, isActive: true },
        }),
      ]);

      return {
        data: events,
        meta: {
          page: currentPage,
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
          hasNextPage: skip + take < total,
        },
      };
    }

    // NON-PAGINATED VERSION
    const events = await this.prisma.event.findMany({
      where: { tenantId, isActive: true },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        shows: {
          orderBy: {
            startTime: 'asc', // ✅ FIXED
          },
          include: {
            screen: {
              include: {
                theater: true,
              },
            },
            seatAvailability: {
              include: { seat: true },
              orderBy: [{ seat: { row: 'asc' } }, { seat: { number: 'asc' } }],
            },
          },
        },
      },
    });

    return {
      data: events,
      meta: {
        nextCursor: null,
        hasNextPage: false,
      },
    };
  }

  async findOne(id: string, tenantId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        shows: {
          orderBy: {
            startTime: 'asc', // ✅ FIXED
          },
          include: {
            screen: {
              include: {
                theater: true,
              },
            },
            seatAvailability: {
              include: { seat: true },
              orderBy: [{ seat: { row: 'asc' } }, { seat: { number: 'asc' } }],
            },
          },
        },
      },
    });

    if (event && event.shows && event.shows.length > 0) {
      const showCount = event.shows.length;
      // Use record access for extended properties if types are not perfectly aligned
      const firstShow = event.shows[0] as Record<string, any>;
      const seatAvailability = (firstShow.seatAvailability || []) as Array<{
        seat?: any;
      }>;
      const seatCount = seatAvailability.length;
      const hasSeatDetails = seatAvailability[0]?.seat != null;
      console.log(
        `[DEBUG] findOne(${id}): Found ${showCount} shows. First show has ${seatCount} seats. Relation 'seat' populated: ${hasSeatDetails}`,
      );
    }

    return event;
  }

  async testPrisma() {
    const events = await this.prisma.event.findMany({
      take: 1,
      include: {
        shows: {
          include: {
            screen: { include: { theater: true } },
            seatAvailability: {
              include: { seat: true },
              orderBy: [
                { seat: { row: 'asc' } },
                { seat: { number: 'asc' } },
              ],
            },
          },
        },
      },
    });

    console.log(`[DEBUG] testPrisma: Found ${events.length} events.`);
    if (events.length > 0) {
      const firstEvent = events[0];
      const firstShow = firstEvent.shows?.[0];
      const hasSeats = (firstShow?.seatAvailability?.length || 0) > 0;
      const hasSeatDetails = firstShow?.seatAvailability?.[0]?.seat != null;
      console.log(
        `[DEBUG] testPrisma: First event shows: ${firstEvent.shows?.length}. Has seats: ${hasSeats}. Has seat details: ${hasSeatDetails}`,
      );
    }

    return {
      success: true,
      data: events,
    };
  }

  async create(data: any) {
    return this.prisma.event.create({
      data: {
        ...data,
        date: new Date(data.date as string | number),
      },
    });
  }

  async ensureTestEventAvailability() {
    let event = await this.prisma.event.findFirst({
      where: { title: 'Test Event' },
    });

    if (!event) {
      event = await this.prisma.event.create({
        data: {
          title: 'Test Event',
          type: 'MOVIE',
          language: 'English',
          duration: 120,
          date: new Date(),
          location: 'Test Location',
          price: 100,
          description: 'Test Description',
          isActive: true,
          totalSeats: 100,
          availableSeats: 100,
        },
      });
    }

    return event;
  }
}
