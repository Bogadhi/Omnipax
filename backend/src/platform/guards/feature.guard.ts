import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureService } from '../feature.service';
import { FEATURE_KEY } from '../decorators/requires-feature.decorator';
import { FeatureKey } from 'ticket-booking-shared';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featureService: FeatureService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<FeatureKey>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!feature) return true;

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId || (request.user?.tenantId);

    const isEnabled = await this.featureService.isEnabled(feature, tenantId);
    
    if (!isEnabled) {
      throw new ForbiddenException(`Feature '${feature}' is currently disabled by platform`);
    }

    return true;
  }
}
