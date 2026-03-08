import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * SuperAdminGuard
 * 
 * Protects routes that should only be accessible by SUPER_ADMIN users.
 * Apply via @UseGuards(SuperAdminGuard) at the controller or route level.
 *
 * Usage:
 *   @Controller('platform')
 *   @UseGuards(JwtAuthGuard, SuperAdminGuard)
 *   export class PlatformController { ... }
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Super Admin access required');
    }

    return true;
  }
}
