import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  BookingStatus,
  Prisma,
  SeatStatus,
  PlatformFeeType,
} from '@prisma/client';
import { BookingGateway } from '../websocket/booking.gateway';

@Injectable()
export class SeatLockService {
  constructor(
    private prisma: PrismaService,
    private gateway: BookingGateway,
  ) {}

  /**
   * Locks seats using Serializable transaction isolation.
   * Prevents double bookings and overselling across high concurrency.
   */
  async lockSeats(
    showId: string,
    seatNumbers: string[],
    userId: string,
    tenantId: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        // 1. Lock the show row to prevent concurrency issues with pricing/capacity
        const show = await tx.show.findUnique({
          where: { id: showId },
        });

        if (!show) {
          throw new NotFoundException('Show not found');
        }

        // 2. Validate seat selection limit
        if (seatNumbers.length > 10) {
          throw new BadRequestException('Cannot book more than 10 seats');
        }

        // 3. Find the Seat underlying models
        const seats = await tx.seat.findMany({
          where: {
            screenId: show.screenId,
            tenantId,
            row: { in: seatNumbers.map((s) => s.charAt(0)) },
          },
        });

        // Accurate map since row + number => seat
        const requestedSeatModels = seats.filter((s) =>
          seatNumbers.includes(`${s.row}${s.number}`),
        );

        if (requestedSeatModels.length !== seatNumbers.length) {
          throw new ConflictException(
            'One or more requested seats are invalid for this show screen',
          );
        }

        // 4. Validate SeatAvailability is AVAILABLE
        const seatIds = requestedSeatModels.map((s) => s.id);
        const availabilities = await tx.seatAvailability.findMany({
          where: {
            showId,
            seatId: { in: seatIds },
            tenantId,
            status: SeatStatus.AVAILABLE,
          },
        });

        if (availabilities.length !== seatNumbers.length) {
          throw new ConflictException(
            'Attempted to lock seats that are not globally AVAILABLE.',
          );
        }

        // 5. Fetch Tenant Monetization Config
        const tenant = await tx.tenant.findUnique({
          where: { id: tenantId },
          select: {
            platformFeeEnabled: true,
            platformFeeType: true,
            platformFeeValue: true,
          },
        });

        // 6. Calculate Price and Fees
        const ticketPrice = new Prisma.Decimal(show.price);
        const ticketAmount = ticketPrice.mul(seatNumbers.length);
        let platformFeeAmount = new Prisma.Decimal(0);

        if (tenant?.platformFeeEnabled) {
          if (tenant.platformFeeType === PlatformFeeType.PERCENTAGE) {
            platformFeeAmount = ticketAmount
              .mul(tenant.platformFeeValue)
              .div(100)
              .toDecimalPlaces(2);
          } else if (tenant.platformFeeType === PlatformFeeType.FLAT) {
            platformFeeAmount = tenant.platformFeeValue; // Per booking
          }
        }

        const totalAmount = ticketAmount.add(platformFeeAmount);
        const theaterNetAmount = ticketAmount;
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // 7. Create the Booking (LOCKED state) with MONETIZATION SNAPSHOT
        const booking = await tx.booking.create({
          data: {
            showId,
            userId,
            tenantId,
            ticketAmount,
            platformFeeAmount,
            totalAmount,
            theaterNetAmount,
            status: BookingStatus.LOCKED,
            lockedUntil: expiresAt,
            expiresAt: expiresAt,
            platformFeeTypeSnapshot:
              tenant?.platformFeeType ?? PlatformFeeType.PERCENTAGE,
            platformFeePercentageSnapshot:
              tenant?.platformFeeType === PlatformFeeType.PERCENTAGE
                ? tenant.platformFeeValue
                : null,
            platformFlatFeeSnapshot:
              tenant?.platformFeeType === PlatformFeeType.FLAT
                ? tenant.platformFeeValue
                : null,
          },
        });

        // 8. Insert SeatLock rows
        const lockPayloads = seatNumbers.map((seatNumber) => ({
          showId,
          seatNumber,
          userId,
          bookingId: booking.id,
          expiresAt,
          status: 'LOCKED',
          tenantId,
        }));

        await tx.seatLock.createMany({
          data: lockPayloads,
        });

        // 9. Generate BookingSeats linkages
        const bookingSeatsData = requestedSeatModels.map((seat) => ({
          bookingId: booking.id,
          seatId: seat.id,
          showId,
          price: show.price,
          status: BookingStatus.LOCKED,
          tenantId,
        }));

        await tx.bookingSeat.createMany({
          data: bookingSeatsData,
        });

        // 10. Update SeatAvailability status
        await tx.seatAvailability.updateMany({
          where: {
            showId,
            seatId: { in: seatIds },
            tenantId,
          },
          data: {
            status: SeatStatus.LOCKED,
            lockedUntil: expiresAt,
            userId,
          },
        });

        // 11. Emit Socket Events
        seatNumbers.forEach((seatNumber) => {
          this.gateway.emitSeatLocked(showId, seatNumber, userId);
        });

        return booking;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async unlockExpiredSeats() {
    const now = new Date();
    await this.prisma.seatAvailability.updateMany({
      where: {
        status: SeatStatus.LOCKED,
        lockedUntil: { lt: now },
      },
      data: {
        status: SeatStatus.AVAILABLE,
        lockedUntil: null,
        userId: null,
      },
    });
  }
}
