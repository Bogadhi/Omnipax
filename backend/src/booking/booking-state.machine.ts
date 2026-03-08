import { BadRequestException } from '@nestjs/common';

/**
 * All allowed booking status transitions.
 *
 * Uses string literals instead of BookingStatus enum to avoid
 * stale-client issues before `prisma generate` is run post-migration.
 */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['LOCKED'],
  LOCKED: ['PAYMENT_IN_PROGRESS', 'EXPIRED', 'FAILED', 'CANCELLED'],
  PAYMENT_IN_PROGRESS: ['CONFIRMED', 'FAILED', 'REFUND_INITIATED'],
  CONFIRMED: ['CANCELLED', 'REFUND_INITIATED'],
  FAILED: ['REFUND_INITIATED'],
  EXPIRED: ['REFUND_INITIATED'],
  CANCELLED: ['REFUND_INITIATED'],
  REFUND_INITIATED: ['REFUNDED', 'REFUND_FAILED'],
  REFUNDED: [],
  REFUND_FAILED: ['REFUND_INITIATED'],
};

/**
 * Validates a booking status transition.
 * Throws BadRequestException if the transition is not allowed.
 *
 * @example
 *   validateTransition(booking.status, 'CANCELLED');
 */
export function validateTransition(from: string, to: string): void {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `Invalid booking state transition: ${from} → ${to}`,
    );
  }
}

/**
 * Returns whether a booking is in a terminal (non-recoverable) state.
 * Terminal states cannot receive further transitions.
 */
export function isTerminalState(status: string): boolean {
  return ['CONFIRMED', 'FAILED', 'EXPIRED', 'REFUNDED'].includes(status);
}
