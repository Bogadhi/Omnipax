import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import QRCode from 'qrcode';
import * as Razorpay from 'razorpay';
import { PrismaService } from '../prisma/prisma.service';
import { SeatUpdatesGateway } from '../realtime/seat-updates.gateway';
import { SeatLocksService } from '../seat-locks/seat-locks.service';
import { TenantContext } from '../common/types/request-context.type';
import { InitiateBookingDto } from './dto/initiate-booking.dto';
import { VerifyTicketDto } from './dto/verify-ticket.dto';

type BookingExpiryJobData = { bookingId: string };

@Injectable()
export class BookingsService {
  private readonly razorpay: Razorpay;
  private readonly bookingTtlMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly seatLocksService: SeatLocksService,
    private readonly configService: ConfigService,
    private readonly seatUpdatesGateway: SeatUpdatesGateway,
    @InjectQueue('booking-expiry')
    private readonly bookingExpiryQueue: Queue<BookingExpiryJobData>,
  ) {
    this.bookingTtlMinutes = Number(
      this.configService.getOrThrow<string>('BOOKING_TTL_MINUTES'),
    );

    this.razorpay = new Razorpay({
      key_id: this.configService.getOrThrow<string>('RAZORPAY_KEY_ID'),
      key_secret: this.configService.getOrThrow<string>('RAZORPAY_KEY_SECRET'),
    });
  }

  async initiateBooking(
    tenant: TenantContext,
    userId: string,
    dto: InitiateBookingDto,
  ) {
    const seatIds = [...new Set(dto.seatIds)];

    const event = await this.prisma.event.findFirst({
      where: {
        id: dto.eventId,
        tenantId: tenant.id,
      },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const seats = await this.prisma.seat.findMany({
      where: {
        id: { in: seatIds },
        eventId: dto.eventId,
      },
      select: { id: true },
    });

    if (seats.length !== seatIds.length) {
      throw new ConflictException('Invalid seats selected for this event');
    }

    await this.seatLocksService.validateLocksOwned(
      tenant.slug,
      dto.eventId,
      seatIds,
      userId,
    );

    const now = new Date();
    const existing = await this.prisma.bookingSeat.findMany({
      where: {
        seatId: { in: seatIds },
        booking: {
          tenantId: tenant.id,
          eventId: dto.eventId,
          OR: [
            {
              status: BookingStatus.CONFIRMED,
            },
            {
              status: BookingStatus.PENDING,
              expiresAt: { gt: now },
            },
          ],
        },
      },
      select: { seatId: true },
    });

    if (existing.length > 0) {
      throw new ConflictException('Some seats are no longer available');
    }

    const currency = (dto.currency || 'INR').toUpperCase();
    const order = await this.razorpay.orders.create({
      amount: dto.amount,
      currency,
      receipt: `bk_${Date.now()}_${randomBytes(4).toString('hex')}`,
      notes: {
        tenantSlug: tenant.slug,
        eventId: dto.eventId,
        userId,
      },
    });

    const expiresAt = new Date(
      now.getTime() + this.bookingTtlMinutes * 60 * 1000,
    );

    const booking = await this.prisma.booking.create({
      data: {
        tenantId: tenant.id,
        userId,
        eventId: dto.eventId,
        status: BookingStatus.PENDING,
        amount: dto.amount,
        currency,
        razorpayOrderId: order.id,
        expiresAt,
        bookingSeats: {
          createMany: {
            data: seatIds.map((seatId) => ({ seatId })),
          },
        },
      },
      include: {
        bookingSeats: {
          select: {
            seatId: true,
          },
        },
      },
    });

    await this.bookingExpiryQueue.add(
      'expire',
      { bookingId: booking.id },
      {
        delay: Math.max(expiresAt.getTime() - Date.now(), 0),
        removeOnComplete: true,
        removeOnFail: 50,
        jobId: `booking-expiry:${booking.id}`,
      },
    );

    await this.seatLocksService.releaseMany(
      tenant.slug,
      dto.eventId,
      seatIds,
      userId,
    );

    this.seatUpdatesGateway.emitSeatsReserved(tenant.slug, dto.eventId, seatIds);

    return {
      bookingId: booking.id,
      status: booking.status,
      expiresAt: booking.expiresAt,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    };
  }

  listMyBookings(tenantId: string, userId: string) {
    return this.prisma.booking.findMany({
      where: {
        tenantId,
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        ticketCode: true,
        ticketQrData: true,
        createdAt: true,
        expiresAt: true,
        event: {
          select: {
            id: true,
            name: true,
            startsAt: true,
          },
        },
        bookingSeats: {
          select: {
            seat: {
              select: {
                id: true,
                seatNumber: true,
              },
            },
          },
        },
      },
    });
  }

  async getTicketByBookingId(tenantId: string, bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        tenantId,
        userId,
      },
      select: {
        id: true,
        status: true,
        ticketCode: true,
        ticketQrData: true,
        event: {
          select: {
            id: true,
            name: true,
            startsAt: true,
          },
        },
        bookingSeats: {
          select: {
            seat: {
              select: {
                seatNumber: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new ConflictException('Booking is not confirmed yet');
    }

    return booking;
  }

  async verifyTicket(tenantId: string, dto: VerifyTicketDto) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        tenantId,
        ticketCode: dto.ticketCode,
        status: BookingStatus.CONFIRMED,
      },
      select: {
        id: true,
        ticketCode: true,
        createdAt: true,
        event: {
          select: {
            id: true,
            name: true,
            startsAt: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bookingSeats: {
          select: {
            seat: {
              select: {
                seatNumber: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Ticket not found or invalid');
    }

    return {
      valid: true,
      booking,
    };
  }

  async processPaymentWebhook(
    rawBody: string,
    signature: string,
    eventIdHeader: string | undefined,
    payload: Record<string, unknown>,
  ) {
    if (!rawBody || !signature) {
      throw new UnauthorizedException('Invalid webhook request');
    }

    const validSignature = this.verifyWebhookSignature(rawBody, signature);
    if (!validSignature) {
      throw new UnauthorizedException('Webhook signature verification failed');
    }

    const paymentEntity =
      ((payload.payload as Record<string, unknown>)?.payment as Record<
        string,
        unknown
      >)?.entity as Record<string, unknown> | undefined;
    const paymentId = paymentEntity?.id as string | undefined;
    const orderId = paymentEntity?.order_id as string | undefined;
    const eventType = payload.event as string | undefined;

    const webhookEventId =
      eventIdHeader || `${eventType || 'unknown'}:${paymentId || randomBytes(4).toString('hex')}`;

    try {
      await this.prisma.paymentWebhookEvent.create({
        data: {
          eventId: webhookEventId,
          eventType: eventType || 'unknown',
          paymentId,
          orderId,
          payload: payload as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { status: 'duplicate', acknowledged: true };
      }
      throw error;
    }

    if (!orderId || !paymentId) {
      return { status: 'ignored', acknowledged: true };
    }

    const booking = await this.prisma.booking.findUnique({
      where: { razorpayOrderId: orderId },
      include: {
        tenant: {
          select: { slug: true },
        },
        bookingSeats: {
          select: { seatId: true },
        },
      },
    });

    if (!booking) {
      return { status: 'booking_not_found', acknowledged: true };
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      return { status: 'already_confirmed', acknowledged: true };
    }

    if (booking.status !== BookingStatus.PENDING) {
      return { status: 'not_pending', acknowledged: true };
    }

    const ticketCode = this.generateTicketCode();
    const qrPayload = {
      bookingId: booking.id,
      tenantSlug: booking.tenant.slug,
      ticketCode,
    };
    const ticketQrData = await QRCode.toDataURL(JSON.stringify(qrPayload));

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CONFIRMED,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        ticketCode,
        ticketQrData,
      },
      select: {
        id: true,
        eventId: true,
        tenant: {
          select: {
            slug: true,
          },
        },
        bookingSeats: {
          select: {
            seatId: true,
          },
        },
      },
    });

    this.seatUpdatesGateway.emitBookingConfirmed(
      updated.tenant.slug,
      updated.eventId,
      updated.bookingSeats.map((item) => item.seatId),
    );

    return { status: 'confirmed', acknowledged: true };
  }

  async expirePendingBooking(bookingId: string) {
    const now = new Date();
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tenant: {
          select: { slug: true },
        },
        bookingSeats: {
          select: {
            seatId: true,
          },
        },
      },
    });

    if (!booking) {
      return;
    }

    if (booking.status !== BookingStatus.PENDING) {
      return;
    }

    if (booking.expiresAt > now) {
      return;
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.EXPIRED },
      select: { id: true },
    });

    this.seatUpdatesGateway.emitBookingExpired(
      booking.tenant.slug,
      booking.eventId,
      booking.bookingSeats.map((item) => item.seatId),
    );
  }

  private verifyWebhookSignature(rawBody: string, signature: string) {
    const secret = this.configService.getOrThrow<string>(
      'RAZORPAY_WEBHOOK_SECRET',
    );
    const expectedSignature = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const providedBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, providedBuffer);
  }

  private generateTicketCode() {
    return `OMX-${randomBytes(4).toString('hex').toUpperCase()}`;
  }
}
