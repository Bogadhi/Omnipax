import { Injectable, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * MonitoringService
 *
 * Centralized monitoring + alerting facade.
 * Wraps Sentry (or any other APM) behind a clean interface.
 *
 * To activate Sentry:
 *   npm install @sentry/node @sentry/nestjs
 *   Set SENTRY_DSN in .env
 *
 * Call sites:
 *   - PaymentWebhookController (payment failures)
 *   - BookingService (seat lock conflicts)
 *   - SeatLockWorker (lock expiry sweep errors)
 *   - All exception filters (global error reporting)
 */
@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private sentryInitialized = false;
  private Sentry: any;

  constructor(private readonly config: ConfigService) {}

  async initialize() {
    const dsn = this.config.get<string>('SENTRY_DSN');
    if (!dsn) {
      this.logger.warn('SENTRY_DSN not configured — monitoring disabled');
      return;
    }

    try {
      // 🎯 [FIX] Resilience: Cast to any to prevent build-time resolution failure if @sentry/node is missing
      this.Sentry = await (import('@sentry/node') as any).catch(() => null);

      if (this.Sentry) {
        this.Sentry.init({
          dsn,
          environment: this.config.get('NODE_ENV', 'development'),
          tracesSampleRate: this.config.get('NODE_ENV') === 'production' ? 0.1 : 1.0,
          integrations: [],
        });
        this.sentryInitialized = true;
        this.logger.log('Sentry monitoring initialized');
      }
    } catch (e: any) {
      this.logger.warn(`Sentry initialization failed: ${e.message}`);
    }
  }

  /**
   * Report a generic error with optional context metadata
   */
  captureError(
    error: Error | unknown,
    context?: Record<string, unknown>,
  ): void {
    const err = error instanceof Error ? error : new Error(String(error));
    this.logger.error(`[MONITOR] ${err.message}`, err.stack);

    if (this.sentryInitialized && this.Sentry) {
      this.Sentry.withScope((scope: any) => {
        if (context) {
          Object.entries(context).forEach(([key, value]) => {
            scope.setExtra(key, value);
          });
        }
        this.Sentry.captureException(err);
      });
    }
  }

  /**
   * Alert on payment failure — triggers high-priority Sentry issue
   */
  alertPaymentFailure(bookingId: string, reason: string, tenantId?: string) {
    this.logger.error(
      `[PAYMENT FAILURE] bookingId=${bookingId} reason=${reason} tenantId=${tenantId}`,
    );
    this.captureError(new Error(`Payment failure: ${reason}`), {
      bookingId,
      tenantId,
      category: 'payment_failure',
    });
  }

  /**
   * Alert on seat lock conflict (concurrency)
   */
  alertSeatConflict(showId: string, seatNumbers: string[], tenantId?: string) {
    this.logger.warn(
      `[SEAT CONFLICT] showId=${showId} seats=${seatNumbers.join(',')}`,
    );
    this.captureError(
      new Error(`Seat lock conflict: ${seatNumbers.join(',')}`),
      { showId, seatNumbers, tenantId, category: 'seat_conflict' },
    );
  }

  /**
   * Alert on webhook processing failure
   */
  alertWebhookFailure(
    razorpayEventId: string,
    bookingId: string,
    error: string,
    retryCount: number,
  ) {
    this.logger.error(
      `[WEBHOOK FAILURE] eventId=${razorpayEventId} booking=${bookingId} retry=${retryCount} error=${error}`,
    );
    if (retryCount >= 3) {
      this.captureError(new Error(`Webhook dead-letter: ${error}`), {
        razorpayEventId,
        bookingId,
        retryCount,
        category: 'webhook_dead_letter',
      });
    }
  }

  /**
   * Alert on Redis connectivity failure
   */
  alertRedisFailure(operation: string, error: string) {
    this.logger.error(`[REDIS FAILURE] operation=${operation} error=${error}`);
    this.captureError(new Error(`Redis failure: ${error}`), {
      operation,
      category: 'redis_failure',
    });
  }
}

@Module({
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
