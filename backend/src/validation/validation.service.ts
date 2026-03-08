import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { AuditService } from '../audit/audit.service';
import { StructuredLogger } from '../common/logger/structured-logger.service';

@Injectable()
export class ValidationService {
  constructor(
    private prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly logger: StructuredLogger,
  ) {
    this.logger.setContext('ValidationService');
  }

  async validateTicket(bookingId: string, qrToken: string, adminId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true, show: { include: { event: true } } },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Ticket is not confirmed');
    }

    if (booking.scannedAt) {
      throw new BadRequestException(
        `Ticket already scanned at ${booking.scannedAt.toISOString()} by ${booking.validatedBy}`,
      );
    }

    if (!booking.qrToken) {
      throw new ForbiddenException('Ticket has no valid QR token generated');
    }

    // Secure Constant-Time Comparison
    const validTokenBuffer = Buffer.from(booking.qrToken, 'hex');
    const providedTokenBuffer = Buffer.from(qrToken, 'hex');

    if (
      validTokenBuffer.length !== providedTokenBuffer.length ||
      !crypto.timingSafeEqual(validTokenBuffer, providedTokenBuffer)
    ) {
      await this.auditService.log(
        'scan_failed',
        { bookingId, reason: 'Invalid Token' },
        adminId,
      );
      throw new ForbiddenException('Invalid QR Token');
    }

    // Update DB (Optimistic Concurrency Control)
    const result = await this.prisma.booking.updateMany({
      where: {
        id: bookingId,
        scannedAt: null,
      },
      data: {
        scannedAt: new Date(),
        validatedBy: adminId,
      },
    });

    if (result.count === 0) {
      throw new BadRequestException(
        'Ticket already scanned (Race Condition Detected)',
      );
    }

    // Fetch updated for response (since updateMany returns count)
    const updated = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!updated) throw new NotFoundException('Booking lost');

    await this.auditService.log(
      'scan_success',
      { bookingId, event: booking.show.event.title },
      adminId,
    );
    this.logger.log(`Ticket ${bookingId} validated by admin ${adminId}`);

    return {
      success: true,
      message: 'Ticket Verified',
      scannedAt: updated.scannedAt,
      event: booking.show.event.title,
      user: booking.user.email,
    };
  }

  async getScanLogs() {
    return this.prisma.booking.findMany({
      where: { scannedAt: { not: null } },
      select: {
        id: true,
        scannedAt: true,
        validatedBy: true,
        show: { select: { event: { select: { title: true } } } },
        user: { select: { email: true } },
      },
      orderBy: { scannedAt: 'desc' },
      take: 100,
    });
  }
}
