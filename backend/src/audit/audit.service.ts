import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    action: string, 
    metadata: any, 
    userId?: string | null, 
    actorRole?: string | null,
    tenantId?: string | null,
    entity?: string | null,
    before?: any,
    after?: any
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          metadata,
          userId,
          actorRole,
          tenantId,
          entity,
          before: before || null,
          after: after || null,
        },
      });
    } catch (e) {
      console.error('Failed to create audit log', e);
    }
  }
}
