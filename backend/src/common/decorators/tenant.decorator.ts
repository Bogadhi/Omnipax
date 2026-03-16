import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestContext, TenantContext } from '../types/request-context.type';

export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestContext>();
    return request.tenant;
  },
);
