import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const SystemEventType = {
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  LOCK_CONFLICT: 'LOCK_CONFLICT',
  LOCK_EXPIRED: 'LOCK_EXPIRED',
  WEBHOOK_REPLAY: 'WEBHOOK_REPLAY',
  REFUND_FAILED: 'REFUND_FAILED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  BOOKING_REFUNDED: 'BOOKING_REFUNDED',
  BOOKING_FAILED: 'BOOKING_FAILED',
  REFUND_INITIATED: 'REFUND_INITIATED',
} as const;

export type SystemEventType = (typeof SystemEventType)[keyof typeof SystemEventType];

@Injectable()
export class SystemEventService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a system event to the SystemEventLog table.
   * Metadata must be lightweight — no large blobs.
   *
   * @param eventType - One of the SystemEventType constants
   * @param entityId  - The booking/show/payment ID this event relates to
   * @param metadata  - Optional lightweight context object
   */
  async log(
    eventType: SystemEventType,
    entityId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await (this.prisma as any).systemEventLog.create({
        data: {
          eventType,
          entityId,
          metadata: metadata ?? null,
        },
      });
    } catch {
      // Never throw from logging — system events must not crash the main flow
    }
  }
}
