import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId || (request.user?.tenantId);

    if (!tenantId) return true; // Non-tenant requests bypass (e.g. system level)

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { 
        monthlyBookingCount: true, 
        bookingLimit: true,
        status: true 
      }
    });

    if (!tenant) return true;

    if (tenant.status !== 'ACTIVE' && tenant.status !== 'TRIAL') {
      throw new ForbiddenException('Tenant access is suspended. Please contact billing.');
    }

    // Check limits for booking operations
    const { method, url } = request;
    if (method === 'POST' && url.includes('/bookings')) {
      if (tenant.monthlyBookingCount >= tenant.bookingLimit) {
        throw new ForbiddenException('Monthly booking limit reached for your current plan. Please upgrade.');
      }
    }

    return true;
  }
}
