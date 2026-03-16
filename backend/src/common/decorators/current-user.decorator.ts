import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUser, RequestContext } from '../types/request-context.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser | null | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestContext>();
    return request.user;
  },
);
