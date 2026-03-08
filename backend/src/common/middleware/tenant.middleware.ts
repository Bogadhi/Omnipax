import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TenantContextService,
  TenantStore,
} from '../services/tenant-context.service';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Prefer the explicit header; fall back to the DEFAULT_TENANT_SLUG env var.
    // This allows unauthenticated public requests (homepage, Android pre-login)
    // to work without requiring the client to know the slug upfront.
    const tenantSlug =
      (req.headers['x-tenant-slug'] as string) ||
      process.env.DEFAULT_TENANT_SLUG;

    if (!tenantSlug) {
      throw new BadRequestException(
        'x-tenant-slug header is required (or set DEFAULT_TENANT_SLUG in .env)',
      );
    }

    // Resolve tenant
    // @ts-ignore - dynamic model access if client not updated
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException('Invalid or inactive tenant');
    }

    // Check for Super Admin bypass from JWT if present
    let isSuperAdmin = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = jwt.decode(token) as any;
        if (payload && payload.role === 'SUPER_ADMIN') {
          isSuperAdmin = true;
        }
      } catch {
        // Ignore decode errors here
      }
    }

    const store: TenantStore = {
      tenantId: tenant.id,
      isSuperAdmin,
    };

    // Attach to request object for convenience
    (req as any).tenant = tenant;

    // Run within AsyncLocalStorage context
    this.tenantContext.run(store, () => next());
  }
}
