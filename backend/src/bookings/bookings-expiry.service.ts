import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BookingService } from './booking.service';
import { BookingStatus } from '@prisma/client';

// ─── Safety limits ───────────────────────────────────────────────────────────
// NEVER load more rows than this per cron tick. Prevents OOM.
const EXPIRY_BATCH_SIZE = 100;
const CLEANUP_BATCH_SIZE = 100;

@Injectable()
export class BookingExpiryService implements OnModuleDestroy {
  private readonly logger = new Logger(BookingExpiryService.name);

  /**
   * CONCURRENCY GUARDS
   * Without these, if a sweep takes > 1 minute (e.g. DB slowdown),
   * the cron fires again mid-run → two concurrent sweeps → 2× memory usage,
   * 2× DB connections held, log spam, and potential double-expiry of bookings.
   */
  private isExpiryRunning = false;
  private isCleanupRunning = false;

  /** Tracks active timers to clear on module destroy */
  private readonly activeTimers = new Set<NodeJS.Timeout>();

  constructor(
    private prisma: PrismaService,
    private bookingService: BookingService,
  ) {}

  onModuleDestroy() {
    // Clear any stray timers to prevent memory leaks on hot-reload
    for (const timer of this.activeTimers) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
  }

  /**
   * CRON 1: Expires LOCKED bookings past their expiresAt time.
   *
   * FIX: Added isExpiryRunning guard to prevent concurrent sweeps.
   * FIX: Added take: EXPIRY_BATCH_SIZE to prevent unbounded findMany.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleAutoExpiry() {
    if (this.isExpiryRunning) {
      this.logger.warn('[BookingExpiry] Previous expiry sweep still running — skipping tick.');
      return;
    }

    this.isExpiryRunning = true;
    const now = new Date();

    try {
      // Paginated to avoid loading all stale bookings at once
      const staleBookings = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.LOCKED,
          expiresAt: { lt: now },
          razorpayPaymentId: null,
        },
        select: { id: true, userId: true, showId: true },
        take: EXPIRY_BATCH_SIZE,
        orderBy: { expiresAt: 'asc' },
      });

      if (staleBookings.length === 0) return;

      this.logger.log(`[BookingExpiry] Found ${staleBookings.length} stale LOCKED bookings to expire.`);

      for (const booking of staleBookings) {
        try {
          await this.prisma.$transaction(async (tx) => {
            const current = await tx.booking.findUnique({
              where: { id: booking.id },
              select: { status: true, razorpayPaymentId: true },
            });

            if (
              !current ||
              current.status !== BookingStatus.LOCKED ||
              current.razorpayPaymentId
            ) {
              return;
            }

            await tx.booking.update({
              where: { id: booking.id },
              data: { status: BookingStatus.EXPIRED },
            });

            await this.bookingService.releaseSeatsSafely(booking.id, tx);
          });
        } catch (err: unknown) {
          this.logger.error(
            `[BookingExpiry] Failed to expire booking ${booking.id}: ${(err as Error).message}`,
          );
        }
      }
    } catch (err: unknown) {
      this.logger.error(`[BookingExpiry] Sweep failed: ${(err as Error).message}`);
    } finally {
      this.isExpiryRunning = false; // ✅ Always release guard
    }
  }

  /**
   * CRON 2: Marks PENDING bookings older than 15 minutes as FAILED.
   *
   * FIX: Added isCleanupRunning guard to prevent concurrent runs.
   * FIX: Added take: CLEANUP_BATCH_SIZE to prevent unbounded findMany.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleInitiatedCleanup() {
    if (this.isCleanupRunning) {
      this.logger.warn('[BookingCleanup] Previous cleanup still running — skipping tick.');
      return;
    }

    this.isCleanupRunning = true;
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);

    try {
      const stalePending = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.PENDING,
          createdAt: { lt: cutoff },
        },
        select: { id: true },
        take: CLEANUP_BATCH_SIZE,
        orderBy: { createdAt: 'asc' },
      });

      if (stalePending.length === 0) return;

      this.logger.log(
        `[BookingCleanup] Found ${stalePending.length} stale PENDING bookings — marking FAILED.`,
      );

      for (const booking of stalePending) {
        try {
          await this.prisma.$transaction(async (tx) => {
            const current = await tx.booking.findUnique({
              where: { id: booking.id },
              select: { status: true },
            });

            if (!current || current.status !== BookingStatus.PENDING) return;

            await tx.booking.update({
              where: { id: booking.id },
              data: { status: BookingStatus.FAILED },
            });
          });
        } catch (err: unknown) {
          this.logger.error(
            `[BookingCleanup] Failed to clean PENDING booking ${booking.id}: ${(err as Error).message}`,
          );
        }
      }
    } catch (err: unknown) {
      this.logger.error(`[BookingCleanup] Sweep failed: ${(err as Error).message}`);
    } finally {
      this.isCleanupRunning = false; // ✅ Always release guard
    }
  }
}
