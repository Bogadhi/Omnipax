import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class DeviceJwtAuthGuard extends AuthGuard('device-jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
