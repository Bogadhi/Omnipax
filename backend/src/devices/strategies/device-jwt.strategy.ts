import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class DeviceJwtStrategy extends PassportStrategy(Strategy, 'device-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.DEVICE_JWT_SECRET || 'fallback_device_secret_please_change',
    });
  }

  async validate(payload: any) {
    if (payload.role !== 'SCANNER_DEVICE') {
      throw new UnauthorizedException('Invalid device token role');
    }
    return { 
      deviceId: payload.deviceId, 
      tenantId: payload.tenantId, 
      role: payload.role 
    };
  }
}
