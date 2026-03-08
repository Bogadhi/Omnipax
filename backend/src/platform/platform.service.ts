import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantPlan, TenantStatus, PlatformStats } from 'ticket-booking-shared';

import { AnomalyDetectionService } from './anomaly-detection.service';

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);

  constructor(
    private prisma: PrismaService,
    private anomalyService: AnomalyDetectionService,
  ) {}

  async getAllTenants() {
    return this.prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            theaters: true,
            bookings: true,
          },
        },
      },
    });
  }

  async getTenantById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        theaters: true,
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async updateTenantStatus(id: string, status: string) {
    return this.prisma.tenant.update({
      where: { id },
      data: { 
        status,
        isActive: status === 'ACTIVE' || status === 'TRIAL'
      },
    });
  }

  async updateTenantPlan(id: string, plan: TenantPlan, bookingLimit?: number) {
    return this.prisma.tenant.update({
      where: { id },
      data: { 
        plan,
        bookingLimit: bookingLimit ?? this.getDefaultLimit(plan)
      },
    });
  }

  private getDefaultLimit(plan: TenantPlan): number {
    switch (plan) {
      case TenantPlan.FREE: return 100;
      case TenantPlan.BASIC: return 1000;
      case TenantPlan.PRO: return 10000;
      case TenantPlan.ENTERPRISE: return 1000000;
      default: return 100;
    }
  }

  async getGlobalStats(): Promise<PlatformStats> {
    const [
      totalTenants,
      activeTenants,
      totalTheaters,
      totalEvents,
      totalBookings,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.theater.count(),
      this.prisma.event.count(),
      this.prisma.booking.count(),
      this.prisma.booking.aggregate({
        _sum: { finalAmount: true },
        where: { status: 'CONFIRMED' }
      }),
    ]);

    // Active users in last 7 days (mocking logic or using updatedAt if available)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const activeUsers7d = await this.prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } } // Simplification: using createdAt as a proxy for now
    });

    return {
      totalTenants,
      activeTenants,
      totalTheaters,
      totalEvents,
      totalBookings,
      totalRevenue: Number(totalRevenue._sum.finalAmount || 0),
      activeUsers7d,
    };
  }

  async getAuditLogs(filters: { tenantId?: string; role?: string; from?: string; to?: string }) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId: filters.tenantId,
        actorRole: filters.role,
        createdAt: {
          gte: filters.from ? new Date(filters.from) : undefined,
          lte: filters.to ? new Date(filters.to) : undefined,
         },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getTenantHealth(tenantId: string) {
    const tenant = await this.getTenantById(tenantId);
    const anomalyData = this.anomalyService.getHealth(tenantId);

    const [recentBookings, recentFailures] = await Promise.all([
      this.prisma.booking.count({
        where: { tenantId, createdAt: { gte: new Date(Date.now() - 86400000) } },
      }),
      this.prisma.paymentLog.count({
        where: { tenantId, status: 'MISMATCH', createdAt: { gte: new Date(Date.now() - 86400000) } },
      }),
    ]);

    return {
      tenantId,
      name: tenant.name,
      status: tenant.status,
      plan: tenant.plan,
      realtime: anomalyData,
      summary: {
        bookings24h: recentBookings,
        failures24h: recentFailures,
      },
    };
  }
}
