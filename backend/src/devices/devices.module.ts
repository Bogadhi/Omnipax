import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { DeviceJwtStrategy } from './strategies/device-jwt.strategy';

import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'device-jwt' }),
    JwtModule.register({
      secret: process.env.DEVICE_JWT_SECRET || 'fallback_device_secret_please_change',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [DevicesService, DeviceJwtStrategy],
  controllers: [DevicesController],
  exports: [DevicesService, DeviceJwtStrategy, PassportModule],
})
export class DevicesModule {}
