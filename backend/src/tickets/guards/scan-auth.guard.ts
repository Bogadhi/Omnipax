import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ScanAuthGuard extends AuthGuard(['jwt', 'device-jwt']) {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
