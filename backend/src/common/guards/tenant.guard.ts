import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../types/request-context.type';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestContext>();
    const rawSlug = request.headers['x-tenant-slug'];
    const tenantSlug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;

    if (!tenantSlug || typeof tenantSlug !== 'string') {
      throw new BadRequestException('x-tenant-slug header is required');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, slug: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    request.tenant = tenant;
    return true;
  }
}
