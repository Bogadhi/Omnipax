import { Injectable, Logger } from '@nestjs/common';

interface TenantMetrics {
  bookingCount: number[];
  failureCount: number[];
  lastWindowReset: number;
}

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);
  private metrics: Map<string, TenantMetrics> = new Map();

  private readonly THRESHOLDS = {
    BOOKINGS_PER_MINUTE: 50,
    FAILURES_PER_MINUTE: 30,
  };

  /**
   * Records a booking attempt and checks for anomalies
   */
  trackBooking(tenantId: string): boolean {
    const metrics = this.getMetrics(tenantId);
    metrics.bookingCount.push(Date.now());
    return this.evaluate(tenantId, metrics);
  }

  /**
   * Records a payment failure and checks for anomalies
   */
  trackFailure(tenantId: string): boolean {
    const metrics = this.getMetrics(tenantId);
    metrics.failureCount.push(Date.now());
    return this.evaluate(tenantId, metrics);
  }

  getHealth(tenantId: string) {
    const metrics = this.metrics.get(tenantId);
    if (!metrics) return { anomalyFlag: false, rates: { bookings: 0, failures: 0 } };

    const now = Date.now();
    const minuteAgo = now - 60000;

    const bRate = metrics.bookingCount.filter(t => t > minuteAgo).length;
    const fRate = metrics.failureCount.filter(t => t > minuteAgo).length;

    return {
      anomalyFlag: bRate > this.THRESHOLDS.BOOKINGS_PER_MINUTE || fRate > this.THRESHOLDS.FAILURES_PER_MINUTE,
      rates: { bookings: bRate, failures: fRate },
    };
  }

  private getMetrics(tenantId: string): TenantMetrics {
    if (!this.metrics.has(tenantId)) {
      this.metrics.set(tenantId, {
        bookingCount: [],
        failureCount: [],
        lastWindowReset: Date.now(),
      });
    }
    return this.metrics.get(tenantId)!;
  }

  private evaluate(tenantId: string, metrics: TenantMetrics): boolean {
    const now = Date.now();
    const minuteAgo = now - 60000;

    // Clean up old metrics
    metrics.bookingCount = metrics.bookingCount.filter(t => t > minuteAgo);
    metrics.failureCount = metrics.failureCount.filter(t => t > minuteAgo);

    const isAnomaly = 
      metrics.bookingCount.length > this.THRESHOLDS.BOOKINGS_PER_MINUTE ||
      metrics.failureCount.length > this.THRESHOLDS.FAILURES_PER_MINUTE;

    if (isAnomaly) {
      this.logger.warn(`[ANOMALY] Tenant ${tenantId} exceeded thresholds. Bookings: ${metrics.bookingCount.length}, Failures: ${metrics.failureCount.length}`);
    }

    return isAnomaly;
  }
}
