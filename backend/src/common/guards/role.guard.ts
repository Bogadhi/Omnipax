import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { TenantContextService } from '../services/tenant-context.service';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tenantContext: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true; // Let AuthGuard handle authentication
    }

    // 1. SUPER_ADMIN Bypass
    if (user.role === (Role as any).SUPER_ADMIN || user.role === 'SUPER_ADMIN') {
      return true;
    }

    // 2. Tenant-Level Consistency Check
    const resolvedTenantId = this.tenantContext.getTenantId();
    const userTenantId = (user as any).tenantId;
    if (resolvedTenantId && userTenantId && userTenantId !== resolvedTenantId) {
      throw new ForbiddenException('Tenant mismatch between token and request');
    }

    // 3. Role-Based Check
    if (requiredRoles) {
      const hasRole = requiredRoles.some((role) => user.role === role);
      if (!hasRole) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    // 4. Theater-Level Restriction
    if (user.role === (Role as any).THEATER_MANAGER || user.role === 'THEATER_MANAGER' || user.role === (Role as any).STAFF || user.role === 'STAFF') {
      const theaterId =
        request.params.theaterId ||
        request.body.theaterId ||
        request.query.theaterId;

      if (theaterId && (user as any).theaterId !== theaterId) {
        throw new ForbiddenException('Access to this theater is restricted');
      }
    }

    return true;
  }
}
