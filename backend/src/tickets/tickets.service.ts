import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QrUtil, QRPayload } from './qr.util';
import * as crypto from 'crypto';
import { Ticket } from '@prisma/client';

export enum ScanStatus {
  SUCCESS = 'SUCCESS',
  ALREADY_USED = 'ALREADY_USED',
  INVALID = 'INVALID',
  EXPIRED = 'EXPIRED',
  WRONG_TENANT = 'WRONG_TENANT',
  NOT_OPEN_YET = 'NOT_OPEN_YET',
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  
  // Enforce gracefully checking environment variables directly or via ConfigService bounds
  private get secret() {
    const rawSec = process.env.QR_SECRET || 'dev_secret_unsecure_override'; // Fallback for dev ease, fail explicitly in prod conceptually
    return rawSec;
  }

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates tickets for a specific booking.
   * Fired when a booking successfully transitions to CONFIRMED.
   */
  async generateTicketsForBooking(bookingId: string, showId: string, tenantId: string) {
    const bookingSeats = await this.prisma.bookingSeat.findMany({
      where: { bookingId, status: 'CONFIRMED' }, // Redundant check for safety
      include: { seat: true }
    });

    // Determine show constraints for exp bound. Assume config +30mins grace past Start.
    const show = await this.prisma.show.findUnique({ where: { id: showId } });
    if (!show) throw new Error(`Show not found for generation: ${showId}`);
    
    // Add explicitly 30 minutes in milliseconds past start time.
    const GRACE_PERIOD_MS = 30 * 60 * 1000; 
    const expirationUnixSecs = Math.floor((show.startTime.getTime() + GRACE_PERIOD_MS) / 1000);

    const generatedTokens: string[] = [];
    const generatedTickets: Ticket[] = [];

    // Use a transaction explicitly enforcing unique creations mitigating duplicate webhooks
    await this.prisma.$transaction(async (tx) => {
      for (const bs of bookingSeats) {
        // 1. Check idempotency. Did replay hit us? Compound unique lookup map definition.
        const existing = await tx.ticket.findFirst({
          where: {
            bookingId, 
            seatNumber: bs.seat.row + bs.seat.number
          }
        });

        if (existing) {
          this.logger.warn(`Ticket generation bypassed via Idempotency: Seat ${bs.seat.row}${bs.seat.number}`);
          continue;
        }

        // 2. We are clear to map a new ticket instance. Let's create an ID first.
        // We defer to Prisma's default uuid() string, however, to embed it into the token,
        // we'll pre-generate the UUID here or let Prisma do it and we read it if we pre-allocate.
        // Easiest is to generate one natively for the payload `t` mapper.
        const newTicketId = crypto.randomUUID();

        // 3. Form Signed Token string
        const payload: QRPayload = {
          t: newTicketId,
          s: showId,
          exp: expirationUnixSecs
        };

        const rawToken = QrUtil.generateSignedToken(payload, this.secret);
        const qrHash = QrUtil.hashToken(rawToken);

        // 4. Save into Database
        const dbTicket = await tx.ticket.create({
          data: {
            id: newTicketId,
            bookingId,
            showId,
            seatNumber: bs.seat.row + bs.seat.number,
            qrHash,
            status: 'ACTIVE',
            tenantId,
          }
        });

        generatedTokens.push(rawToken);
        generatedTickets.push(dbTicket);
      }
    });

    return { tickets: generatedTickets, tokens: generatedTokens };
  }

  /**
   * Strict validation logic. Unpack the payload securely locally WITHOUT
   * engaging the database first, eliminating brute-forcing vectors against
   * the Postgres instances directly.
   */
  async scanTicket(
    qrToken: string,
    scannerUserId: string,
    scannerTenantId: string,
    deviceId?: string,
    scanSource: 'STAFF' | 'DEVICE' = 'STAFF'
  ): Promise<{ status: ScanStatus; seat: string | null; showId: string | null; scannedAt: string }> {
    const startTime = Date.now();
    let scanResult: ScanStatus = ScanStatus.SUCCESS;
    let ticketId: string | null = null;
    let seatNumber: string | null = null;
    let showId: string | null = null;

    // Helper wrapper strictly writing to Database even on immediate invalid signature paths
    const finalizeScan = async (status: ScanStatus, extractedTicketId: string | null) => {
      // Create independent log regardless of prior transaction success via raw insert
      await this.prisma.ticketScanLog.create({
        data: {
          ticketId: extractedTicketId || 'UNKNOWN_OR_TAMPERED',
          scannedBy: scannerUserId,
          deviceId: deviceId,
          scanSource: scanSource,
          result: status,
          tenantId: scannerTenantId,
        }
      });
      
      this.logger.log(`Ticket Scan [${scanSource}] result: ${status} in ${Date.now() - startTime}ms`);

      return {
        status,
        seat: seatNumber,
        showId: showId,
        scannedAt: new Date().toISOString(),
      };
    };

    // 0. If scanSource is DEVICE, verify device isActive and update lastSeenAt
    if (scanSource === 'DEVICE' && deviceId) {
      const device = await this.prisma.scannerDevice.findFirst({
        where: { id: deviceId, tenantId: scannerTenantId, isActive: true }
      });
      if (!device) {
        // Return INVALID if device is deactivated or cross-tenant hijacked
        return finalizeScan(ScanStatus.INVALID, null);
      }
      // Health check update
      await this.prisma.scannerDevice.update({
        where: { id: deviceId },
        data: { lastSeenAt: new Date() }
      });
    }

    // 1. Check localized cryptography rules WITHOUT ANY DB queries.
    const { isValid, payload } = QrUtil.validateToken(qrToken, this.secret);
    
    if (!isValid || !payload) {
      return finalizeScan(ScanStatus.INVALID, null);
    }
    
    // Extracted payload looks nominally formatted and is legitimately signed by our backend
    ticketId = payload.t;
    showId = payload.s;

    // Ensure we hash out the query immediately decoupling raw from SQL layers
    const hashedQueryTarget = QrUtil.hashToken(qrToken);

    // 2. Safely Query isolated Ticket
    const ticket = await this.prisma.ticket.findUnique({
      where: { qrHash: hashedQueryTarget }
    });

    // 3. DB Mismatch -> The underlying ticket was wiped, or Hash failed logic constraints.
    if (!ticket) {
      return finalizeScan(ScanStatus.INVALID, ticketId);
    }

    seatNumber = ticket.seatNumber; // Decorate payload scope

    // 4. Validate Cross-Tenant Isolation strictly preventing staff scanning wrong shows
    if (ticket.tenantId !== scannerTenantId) {
      return finalizeScan(ScanStatus.WRONG_TENANT, ticketId);
    }

    // 5. Hard boundary Expiration enforcing Show bounds (Grace Period configured +30m by payload gen typically)
    const currentUnix = Math.floor(Date.now() / 1000);
    if (currentUnix > payload.exp) {
      return finalizeScan(ScanStatus.EXPIRED, ticketId);
    }

    // 6. DB Expiration override and Early Entry Lock
    const show = await this.prisma.show.findUnique({ where: { id: ticket.showId } });
    if (show) {
       const GRACE_PERIOD_MS = 30 * 60 * 1000;
       const EARLY_ENTRY_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours before show
       const nowMs = Date.now();

       if (nowMs > show.startTime.getTime() + GRACE_PERIOD_MS) {
         return finalizeScan(ScanStatus.EXPIRED, ticketId);
       }

       if (nowMs < show.startTime.getTime() - EARLY_ENTRY_WINDOW_MS) {
         return finalizeScan(ScanStatus.NOT_OPEN_YET, ticketId);
       }
    }

    // 7. Check usage state cleanly, falling back to ALREADY_USED safely avoiding exception throw logic
    if (ticket.status === 'USED') {
      // TODO: Fraud Alert Threshold (e.g. if we track multiple scans on same USED ticket, generate a Fraud Alert)
      return finalizeScan(ScanStatus.ALREADY_USED, ticketId);
    }

    if (ticket.status !== 'ACTIVE') {
      return finalizeScan(ScanStatus.INVALID, ticketId); // CANCELLED or other unknown statuses
    }

    // 8. Safely Mutate State. 
    // Use `updateMany` to ensure lock concurrency. Only exactly ONE row mutation counts.
    const updateResult = await this.prisma.ticket.updateMany({
      where: {
        id: ticket.id,
        status: 'ACTIVE' // Explicit condition protects against a race scanning simultaneous duplicates
      },
      data: {
        status: 'USED',
        scannedAt: new Date(),
        scannedBy: scannerUserId,
      }
    });

    if (updateResult.count === 0) {
      // Another thread explicitly beat us to the 'ACTIVE' mutation state inside split second
      return finalizeScan(ScanStatus.ALREADY_USED, ticketId);
    }

    // 9. Successfully recorded explicitly via 1 update
    return finalizeScan(ScanStatus.SUCCESS, ticketId);
  }

  /**
   * Fetch tickets strictly for viewing generated tokens matching isolated bounds
   */
  async getTicketsForBooking(bookingId: string, tenantId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: { bookingId, tenantId },
      orderBy: { seatNumber: 'asc' }
    });
    
    // We cannot regenerate raw tokens safely if we drop secrets unless we recalculate 
    // However, we just return the ticket info here. The raw token was generated locally
    return tickets;
  }
}
