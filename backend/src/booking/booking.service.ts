import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShowDto } from './dto/create-show.dto';
import { BookingGateway } from '../websocket/booking.gateway';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { BookingStatus, SeatStatus, Prisma } from '@prisma/client';

// ─── Seat Code Parser ────────────────────────────────────────────────────────
/**
 * Safely parses a seat code such as "A1", "C12", "AB3" into { row, number }.
 *
 * Rules:
 *   - Must start with one or more uppercase letters (the row)
 *   - Must end with one or more digits (the seat number)
 *   - Throws BadRequestException immediately on any invalid input
 *   - NEVER produces NaN
 *
 * Valid:   "A1"  "B10"  "AB3"  "Z99"
 * Invalid: "1"   "7"    ""     "undefined"  "A"  "null"
 */
function parseSeatCode(seatCode: string): { row: string; number: number } {
  if (!seatCode || typeof seatCode !== 'string') {
    throw new BadRequestException(
      `Invalid seat code: expected format like "A1" but received ${JSON.stringify(seatCode)}`,
    );
  }

  // Match: one or more letters followed immediately by one or more digits, nothing else
  const match = seatCode.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);

  if (!match) {
    throw new BadRequestException(
      `Invalid seat code format: "${seatCode}". Expected letter(s) followed by digit(s), e.g. "A1", "C12".`,
    );
  }

  const row = match[1];           // guaranteed: non-empty letters
  const number = parseInt(match[2], 10); // guaranteed: valid integer, no NaN

  if (isNaN(number) || number < 1) {
    // Defensive double-check — should never be reached due to regex, but belt-and-suspenders
    throw new BadRequestException(
      `Seat number is invalid in code "${seatCode}": parsed as ${number}`,
    );
  }

  return { row, number };
}

@Injectable()
export class BookingService {
  private razorpay: Razorpay;
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: BookingGateway,
  ) {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });
  }

  private getPrisma(tx?: Prisma.TransactionClient) {
    return tx || this.prisma;
  }

  // 1. lockSeats (Hardened — NaN-safe)
  async lockSeats(
    showId: string,
    seatNumbers: string[],
    userId: string,
    tenantId: string,
  ) {
    // ── PRE-FLIGHT: Validate all seat codes BEFORE any DB call ───────────────
    this.logger.debug(
      `[lockSeats] showId=${showId} userId=${userId} tenantId=${tenantId} ` +
      `requestedSeats=${JSON.stringify(seatNumbers)}`,
    );

    if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      throw new BadRequestException('seatNumbers must be a non-empty array');
    }
    if (seatNumbers.length > 10) {
      throw new BadRequestException('Maximum 10 seats per booking');
    }

    // Parse and validate ALL seat codes — throws 400 immediately on any bad input
    let seatConditions: { row: string; number: number }[];
    try {
      seatConditions = seatNumbers.map((sn) => parseSeatCode(sn));
    } catch (parseErr) {
      this.logger.warn(
        `[lockSeats] Seat code parse failure: ${(parseErr as Error).message} ` +
        `| raw input: ${JSON.stringify(seatNumbers)}`,
      );
      throw parseErr; // re-throw the BadRequestException
    }

    // Additional NaN guard — should never trigger after parseSeatCode, but explicit safety net
    const nanEntry = seatConditions.find((c) => isNaN(c.number));
    if (nanEntry) {
      throw new BadRequestException(
        `Fatal: seat number resolved to NaN for row "${nanEntry.row}". ` +
        `Raw seatNumbers: ${JSON.stringify(seatNumbers)}`,
      );
    }

    this.logger.debug(
      `[lockSeats] parsedConditions=${JSON.stringify(seatConditions)}`,
    );

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Verify Show
        const show = await tx.show.findUnique({
          where: { id: showId },
        });
        if (!show) throw new NotFoundException('Show not found');

        // 🎯 [HARDENING] Step 3C: Use SELECT FOR UPDATE to lock the show and its capacity
        // This prevents race conditions at the DB level, ensuring strict serializability.
        await tx.$executeRawUnsafe(
          `SELECT id FROM "Show" WHERE id = '${showId}' FOR UPDATE`,
        );

        // 2. Fetch Seat IDs using SAFE parsed row/number conditions
        const seats = await tx.seat.findMany({
          where: {
            screenId: show.screenId,
            tenantId,
            OR: seatConditions.map(({ row, number }) => ({ row, number })),
          },
        });

        this.logger.debug(
          `[lockSeats] DB returned ${seats.length} seats for ${seatNumbers.length} requested`,
        );

        if (seats.length !== seatNumbers.length) {
          const foundCodes = seats.map((s) => `${s.row}${s.number}`);
          const missing = seatNumbers.filter(
            (sn) => !foundCodes.includes(sn.toUpperCase()),
          );
          throw new BadRequestException(
            `Invalid seats not found in this show: ${missing.join(', ')}`,
          );
        }

        const seatIds = seats.map((s) => s.id);

        // 3. ATOMIC STATUS UPDATE (The primary concurrency guard)
        const updateResult = await tx.seatAvailability.updateMany({
          where: {
            showId,
            seatId: { in: seatIds },
            status: SeatStatus.AVAILABLE,
            tenantId,
          },
          data: {
            status: SeatStatus.LOCKED,
            lockedUntil: expiresAt,
            userId,
          },
        });

        if (updateResult.count !== seatIds.length) {
          throw new ConflictException('One or more seats are no longer available');
        }

        // 4. Create SeatLock Records (Secondary concurrency guard via unique constraint)
        await tx.seatLock.createMany({
          data: seatNumbers.map((sn) => ({
            showId,
            seatNumber: sn,
            userId,
            bookingId: 'TEMP', // Will update after booking creation
            expiresAt,
            status: 'LOCKED',
            tenantId,
          })),
        });

        const totalAmount = new Prisma.Decimal(show.price).mul(seatIds.length);

        // 5. Create Booking
        const booking = await tx.booking.create({
          data: {
            userId,
            showId,
            tenantId,
            totalAmount,
            status: BookingStatus.LOCKED,
            expiresAt,
          },
        });

        // 6. Update SeatLocks with real bookingId
        await tx.seatLock.updateMany({
          where: { showId, seatNumber: { in: seatNumbers }, userId },
          data: { bookingId: booking.id },
        });

        // 7. Create BookingSeats
        await tx.bookingSeat.createMany({
          data: seatIds.map((seatId) => ({
            bookingId: booking.id,
            seatId,
            showId,
            price: show.price,
            tenantId,
            status: BookingStatus.LOCKED,
          })),
        });

        // 8. Initiate Razorpay Order
        const razorpayOrder = await this.razorpay.orders.create({
          amount: Math.round(totalAmount.toNumber() * 100),
          currency: 'INR',
          receipt: booking.id,
        });

        await tx.booking.update({
          where: { id: booking.id },
          data: { razorpayOrderId: razorpayOrder.id },
        });

        // 9. Emit Socket Events
        seatIds.forEach((sid) => {
          this.gateway.emitSeatLocked(showId, sid, userId);
        });

        return {
          success: true,
          bookingId: booking.id,
          razorpayOrderId: razorpayOrder.id,
          amount: totalAmount.toNumber(),
          currency: 'INR',
        };
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error: any) {
      if (error && error.code === 'P2002') {
        throw new ConflictException('One or more seats are already locked by another user');
      }
      throw error;
    }
  }

  // 2. releaseSeatsSafely
  async releaseSeatsSafely(bookingId: string, tx?: Prisma.TransactionClient) {
    const prisma = this.getPrisma(tx);
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { bookingSeats: true },
    });

    if (!booking) return;

    const seatIds = booking.bookingSeats.map(
      (bs: { seatId: string }) => bs.seatId,
    );

    await prisma.seatAvailability.updateMany({
      where: {
        showId: booking.showId,
        seatId: { in: seatIds },
      },
      data: {
        status: SeatStatus.AVAILABLE,
        lockedUntil: null,
        userId: null,
      },
    });

    // Emit socket events for each released seat
    seatIds.forEach((seatId) => {
      this.gateway.emitSeatReleased(booking.showId, seatId);
    });
  }

  // 3. cancelBooking
  async cancelBooking(bookingId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, userId },
      });

      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.status === BookingStatus.CANCELLED) return { success: true };

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      await this.releaseSeatsSafely(bookingId, tx);
      return { success: true };
    });
  }

  // 4. confirmPayment
  async confirmPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    userId: string,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { razorpayOrderId },
    });

    if (!booking || booking.userId !== userId) {
      throw new NotFoundException('Booking not found');
    }

    // 2. Ensure Booking status is LOCKED or PENDING
    if (booking.status !== BookingStatus.LOCKED && booking.status !== BookingStatus.PENDING) {
      if (booking.status === BookingStatus.CONFIRMED) return { success: true };
      throw new BadRequestException('Booking is not in a payable state');
    }

    // 3. Ensure not expired
    if (booking.expiresAt && new Date() > booking.expiresAt) {
      throw new BadRequestException('Booking has expired');
    }

    // 4. Verify Signature
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    if (expected !== razorpaySignature) {
      throw new UnauthorizedException('Invalid payment signature');
    }

    return this.confirmBookingFromRazorpay(
      booking.id,
      razorpayPaymentId,
      razorpaySignature,
    );
  }

  // 5. confirmBookingFromRazorpay
  async confirmBookingFromRazorpay(
    bookingId: string,
    paymentId: string,
    signature: string,
    tx?: Prisma.TransactionClient,
  ) {
    const run = async (ptx: Prisma.TransactionClient) => {
      const booking = await ptx.booking.findUnique({
        where: { id: bookingId },
        include: { bookingSeats: true },
      });

      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.status === BookingStatus.CONFIRMED) return { success: true };

      const seatIds = booking.bookingSeats.map(
        (bs: { seatId: string }) => bs.seatId,
      );
      
      const conflictingSeats = await ptx.seatAvailability.findMany({
        where: {
          showId: booking.showId,
          seatId: { in: seatIds },
          status: SeatStatus.BOOKED
        }
      });

      if (conflictingSeats.length > 0) {
        throw new BadRequestException(
          'Concurrency error: One or more selected seats were already booked.',
        );
      }

      // Generate a signed QR token
      const timestamp = Date.now();
      const qrData = `${bookingId}:${booking.tenantId}:${booking.showId}:${timestamp}`;
      const qrToken = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'qr_secret')
        .update(qrData)
        .digest('hex');
      
      const qrPayload = {
        bookingId,
        tenantId: booking.tenantId,
        showId: booking.showId,
        token: qrToken,
        timestamp,
      };

      await ptx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CONFIRMED,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
          paymentCapturedAt: new Date(),
          qrToken: JSON.stringify(qrPayload),
        },
      });

      // Create Ticket records for each seat
      for (const bs of booking.bookingSeats) {
        const seat = await ptx.seat.findUnique({ where: { id: bs.seatId } });
        const qrHash = crypto
          .createHash('sha256')
          .update(`${bookingId}|${bs.seatId}|${qrToken}`)
          .digest('hex');

        await ptx.ticket.create({
          data: {
            bookingId: booking.id,
            showId: booking.showId,
            seatNumber: seat ? `${seat.row}${seat.number}` : '??',
            qrHash,
            status: 'VALID',
            tenantId: booking.tenantId!,
          },
        });
      }

      // Update seat availability to BOOKED
      // We only update if the seat is currently LOCKED by this user or AVAILABLE (expired but not re-locked)
      const updateResult = await ptx.seatAvailability.updateMany({
        where: {
          showId: booking.showId,
          seatId: { in: seatIds },
          OR: [
            { status: SeatStatus.LOCKED, userId: booking.userId },
            { status: SeatStatus.AVAILABLE },
          ],
        },
        data: {
          status: SeatStatus.BOOKED,
          lockedUntil: null,
          userId: booking.userId,
        },
      });

      if (updateResult.count !== seatIds.length) {
        throw new BadRequestException('Some seats are no longer held by your booking. Payment may need refunding.');
      }

      // Decrement show.remainingCapacity so all platforms see updated availability
      await ptx.show.update({
        where: { id: booking.showId },
        data: {
          remainingCapacity: { decrement: seatIds.length },
        },
      });

      // Decrement event.availableSeats to keep the Event table in sync
      // (Android EventDto reads event.availableSeats directly)
      const showRecord = await ptx.show.findUnique({ where: { id: booking.showId }, select: { eventId: true } });
      if (showRecord?.eventId) {
        await ptx.event.update({
          where: { id: showRecord.eventId },
          data: { availableSeats: { decrement: seatIds.length } },
        });
      }

      // Also mark BookingSeats as CONFIRMED
      await ptx.bookingSeat.updateMany({
        where: { bookingId },
        data: { status: BookingStatus.CONFIRMED },
      });

      this.gateway.emitBookingConfirmed(booking.showId, bookingId, seatIds);

      return { success: true };
    };

    if (tx) return run(tx);
    return this.prisma.$transaction(run);
  }
  // 6. getUserBookings
  async getUserBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        show: {
          include: { event: true }
        },
        bookingSeats: {
          include: { seat: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 7. getBookingById
  async getBookingById(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, userId },
      include: {
        show: {
          include: { event: true, screen: true }
        },
        bookingSeats: {
          include: { seat: true },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  // 8. createShow
  async createShow(dto: CreateShowDto) {
    // In a real multi-tenant app, we'd get tenantId from the requesting user
    // For admin creation, we might need a default or specific tenantId.
    // Assuming for now it's linked to the screen's tenant.
    const screen = await this.prisma.screen.findUnique({
      where: { id: dto.screenId },
    });
    if (!screen) throw new NotFoundException('Screen not found');

    const show = await this.prisma.show.create({
      data: {
        startTime: new Date(dto.startTime),
        price: dto.price,
        eventId: dto.eventId,
        screenId: dto.screenId,
        tenantId: screen.tenantId,
      },
    });

    // Initialize seat availability
    const seats = await this.prisma.seat.findMany({
      where: { screenId: dto.screenId }
    });

    if (seats.length > 0) {
      await this.prisma.seatAvailability.createMany({
        data: seats.map((seat) => ({
          showId: show.id,
          seatId: seat.id,
          status: SeatStatus.AVAILABLE,
          tenantId: screen.tenantId,
        })),
        skipDuplicates: true,
      });
      
      await this.prisma.show.update({
        where: { id: show.id },
        data: {
          totalCapacity: seats.length,
          remainingCapacity: seats.length,
        },
      });
    }

    return show;
  }

  // 9. deleteShow
  async deleteShow(showId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.seatAvailability.deleteMany({ where: { showId } });
      await tx.show.delete({ where: { id: showId } });
      return { success: true };
    });
  }

  // 10. getSeats
  async getSeats(showId: string) {
    return this.prisma.seatAvailability.findMany({
      where: { showId },
      include: { seat: true },
      orderBy: [
        { seat: { row: 'asc' } },
        { seat: { number: 'asc' } },
      ],
    });
  }

  async lockGeneralAdmission(userId: string, showId: string, qty: number) {
    this.logger.log(
      `GA lock request: user=${userId}, show=${showId}, qty=${qty}`,
    );
    return { success: true, message: 'GA locked (Mock Implementation)' };
  }

  // 12. repairAllShows
  async repairAllShows() {
    this.logger.log('Repairing all shows seat availability...');
    const shows = await this.prisma.show.findMany({
      include: { seatAvailability: { take: 1 } },
    });

    for (const show of shows) {
      if (show.seatAvailability.length === 0) {
        this.logger.log(`Initializing seats for show ${show.id}`);
        const seats = await this.prisma.seat.findMany({
          where: { screenId: show.screenId },
        });
        
        if (seats.length > 0) {
          await this.prisma.seatAvailability.createMany({
            data: seats.map((seat) => ({
              showId: show.id,
              seatId: seat.id,
              status: SeatStatus.AVAILABLE,
              tenantId: show.tenantId,
            })),
            skipDuplicates: true,
          });

          await this.prisma.show.update({
            where: { id: show.id },
            data: {
              totalCapacity: seats.length,
              remainingCapacity: seats.length
            }
          });
        }
      }
    }
    this.logger.log('Show repair completed.');
  }
}
