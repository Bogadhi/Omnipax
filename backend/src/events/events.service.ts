import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SeatLocksService } from '../seat-locks/seat-locks.service';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seatLocksService: SeatLocksService,
  ) {}

  async createEvent(tenantId: string, dto: CreateEventDto) {
    const startsAt = new Date(dto.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      throw new ConflictException('Invalid startsAt date');
    }

    const seatStartNumber = dto.seatStartNumber ?? 1;
    const seatEntries = Array.from({ length: dto.totalSeats }).map((_, index) => ({
      seatNumber: seatStartNumber + index,
    }));

    return this.prisma.event.create({
      data: {
        tenantId,
        name: dto.name,
        startsAt,
        totalSeats: dto.totalSeats,
        seats: {
          createMany: {
            data: seatEntries,
          },
        },
      },
      select: {
        id: true,
        name: true,
        startsAt: true,
        totalSeats: true,
        createdAt: true,
      },
    });
  }

  listEvents(tenantId: string) {
    return this.prisma.event.findMany({
      where: { tenantId },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        name: true,
        startsAt: true,
        totalSeats: true,
        createdAt: true,
      },
    });
  }

  async getSeatMap(
    tenantId: string,
    tenantSlug: string,
    eventId: string,
    userId?: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
      include: {
        seats: {
          orderBy: { seatNumber: 'asc' },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const now = new Date();

    const busySeatRows = await this.prisma.bookingSeat.findMany({
      where: {
        seatId: { in: event.seats.map((seat) => seat.id) },
        booking: {
          tenantId,
          eventId,
          OR: [
            { status: BookingStatus.CONFIRMED },
            {
              status: BookingStatus.PENDING,
              expiresAt: { gt: now },
            },
          ],
        },
      },
      select: {
        seatId: true,
        booking: {
          select: {
            status: true,
            userId: true,
          },
        },
      },
    });

    const lockedSeats = await this.seatLocksService.getLocksForEvent(
      tenantSlug,
      eventId,
    );

    const busySeatMap = new Map(busySeatRows.map((item) => [item.seatId, item.booking]));
    const lockMap = new Map(lockedSeats.map((lock) => [lock.seatId, lock]));

    const seats = event.seats.map((seat) => {
      const booked = busySeatMap.get(seat.id);
      const lock = lockMap.get(seat.id);

      if (booked) {
        return {
          id: seat.id,
          seatNumber: seat.seatNumber,
          status:
            booked.status === BookingStatus.CONFIRMED
              ? 'BOOKED'
              : 'PENDING_PAYMENT',
          mine: booked.userId === userId,
        };
      }

      if (lock) {
        return {
          id: seat.id,
          seatNumber: seat.seatNumber,
          status: lock.userId === userId ? 'LOCKED_BY_ME' : 'LOCKED',
          mine: lock.userId === userId,
        };
      }

      return {
        id: seat.id,
        seatNumber: seat.seatNumber,
        status: 'AVAILABLE',
        mine: false,
      };
    });

    return {
      event: {
        id: event.id,
        name: event.name,
        startsAt: event.startsAt,
      },
      seats,
    };
  }
}
