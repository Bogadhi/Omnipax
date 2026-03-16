import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, SeatStatus } from '@prisma/client';

// 🔒 Safety limit — NEVER load more than this many locks into memory at once.
// Prevents FATAL: JavaScript heap out of memory.
const SWEEP_BATCH_SIZE = 200;

@Injectable()
export class SeatLockWorker {
  private readonly logger = new Logger(SeatLockWorker.name);
  /** Guard: prevents concurrent sweeps from overlapping if one runs long */
  private isSweeping = false;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs every 30 seconds to reclaim expired SeatLocks.
   * Uses batched processing with a hard ceiling (SWEEP_BATCH_SIZE) to prevent
   * unbounded memory usage that caused the FATAL: heap out of memory crash.
   *
   * ROOT CAUSE OF CRASH: The original `findMany` with no `take` limit would load
   * ALL expired locks (potentially millions of rows) into the JS heap, crashing
   * the process. Fixed with a paginated batch loop + concurrent-sweep guard.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async releaseExpiredLocks() {
    if (this.isSweeping) {
      this.logger.warn('Previous sweep still running — skipping this cycle.');
      return;
    }

    // Memory diagnostic — log heap before each sweep to detect growth trends
    const mem = process.memoryUsage();
    this.logger.debug(
      `[SeatLockWorker] Heap used: ${Math.round(mem.heapUsed / 1024 / 1024)} MB / ` +
      `${Math.round(mem.heapTotal / 1024 / 1024)} MB total`,
    );

    this.isSweeping = true;
    this.logger.log('Starting expiry sweep for stale SeatLocks...');

    const now = new Date();
    let totalReleased = 0;

    try {
      // Process in batches — avoids loading all expired locks into memory at once
      while (true) {
        const expiredLocks = await this.prisma.seatLock.findMany({
          where: {
            status: 'LOCKED',
            expiresAt: { lte: now },
          },
          select: {
            id: true,
            bookingId: true,
            showId: true,
            seatNumber: true,
          },
          take: SWEEP_BATCH_SIZE,  // ✅ HARD LIMIT — prevents OOM
          orderBy: { expiresAt: 'asc' },
        });

        if (expiredLocks.length === 0) {
          break; // No locks remaining this cycle
        }

        const bookingIds = [...new Set(expiredLocks.map((l) => l.bookingId))];
        const lockIds = expiredLocks.map((l) => l.id);

        await this.prisma.$transaction(async (tx) => {
          // Mark SeatLocks as RELEASED
          await tx.seatLock.updateMany({
            where: { id: { in: lockIds } },
            data: { status: 'RELEASED' },
          });

          // Mark Bookings as EXPIRED (only if they are still LOCKED)
          await tx.booking.updateMany({
            where: {
              id: { in: bookingIds },
              status: BookingStatus.LOCKED,
            },
            data: { status: BookingStatus.EXPIRED },
          });

          // Loop over affected bookings to find the physical seats and free them
          for (const bookingId of bookingIds) {
            const bookingSeats = await tx.bookingSeat.findMany({
              where: { bookingId },
              select: { seatId: true, showId: true },
            });

            const seatIds = bookingSeats.map((bs) => bs.seatId);
            if (seatIds.length > 0 && bookingSeats[0]?.showId) {
              const showId = bookingSeats[0].showId;

              await tx.seatAvailability.updateMany({
                where: {
                  showId,
                  seatId: { in: seatIds },
                  status: SeatStatus.LOCKED,
                },
                data: {
                  status: SeatStatus.AVAILABLE,
                  lockedUntil: null,
                  userId: null,
                },
              });

              await tx.bookingSeat.updateMany({
                where: { bookingId },
                data: { status: BookingStatus.EXPIRED },
              });
            }
          }
        });

        totalReleased += expiredLocks.length;
        this.logger.log(
          `Released batch of ${expiredLocks.length} locks (total this cycle: ${totalReleased})`,
        );

        // If we got a full batch, there may be more — continue looping.
        // A partial batch means we've exhausted this sweep cycle.
        if (expiredLocks.length < SWEEP_BATCH_SIZE) {
          break;
        }
      }

      if (totalReleased > 0) {
        this.logger.log(`Sweep complete. Total released: ${totalReleased} seat locks.`);
      } else {
        this.logger.debug('Sweep complete. No expired locks found.');
      }
    } catch (error) {
      this.logger.error('Failed to sweep expired seat locks.', error);
    } finally {
      // Always release the guard, even if an error occurs
      this.isSweeping = false;
    }
  }
}
