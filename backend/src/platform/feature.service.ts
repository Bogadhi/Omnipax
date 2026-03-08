import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureKey } from 'ticket-booking-shared';

@Injectable()
export class FeatureService {
  constructor(private prisma: PrismaService) {}

  async isEnabled(key: FeatureKey, tenantId?: string): Promise<boolean> {
    // 1. Check tenant-specific override
    if (tenantId) {
      const tenantFlag = await this.prisma.featureFlag.findUnique({
        where: {
          key_tenantId: { key, tenantId },
        },
      });
      if (tenantFlag) return tenantFlag.enabled;
    }

    // 2. Fallback to global flag (tenantId is null)
    const globalFlag = await this.prisma.featureFlag.findFirst({
      where: {
        key,
        tenantId: null,
      },
    });

    return globalFlag?.enabled ?? false;
  }

  async getAllFlags() {
    return this.prisma.featureFlag.findMany();
  }

  async setFlag(key: string, enabled: boolean, tenantId?: string) {
    // For upsert we need to be careful with the unique constraint
    const existing = await this.prisma.featureFlag.findFirst({
      where: { key, tenantId: tenantId ?? null }
    });

    if (existing) {
      return this.prisma.featureFlag.update({
        where: { id: existing.id },
        data: { enabled }
      });
    }

    return this.prisma.featureFlag.create({
      data: { key, enabled, tenantId: tenantId ?? null }
    });
  }
}
