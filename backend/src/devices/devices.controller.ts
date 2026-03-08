import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import {
  RegisterDeviceDto,
  AuthenticateDeviceDto,
  SyncScansDto,
} from './dto/device.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeviceJwtAuthGuard } from './guards/device-jwt.guard';

@ApiTags('Devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TENANT_ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register a new scanner device (Returns raw key once)',
  })
  async register(@Body() dto: RegisterDeviceDto) {
    return this.devicesService.registerDevice(dto.name, dto.tenantId);
  }

  @Post('authenticate')
  @ApiOperation({
    summary:
      'Authenticate a scanner device to receive a short-lived Device JWT',
  })
  async authenticate(@Body() dto: AuthenticateDeviceDto) {
    return this.devicesService.authenticateDevice(dto.deviceId, dto.deviceKey);
  }

  @Post('sync-scans')
  @UseGuards(DeviceJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Sync batched offline scans from an authorized device',
  })
  async sync(@Body() dto: SyncScansDto, @Req() req: { user: { deviceId: string, tenantId: string } }) {
    return this.devicesService.syncOfflineScans(
      req.user.deviceId,
      req.user.tenantId,
      dto.scans,
    );
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TENANT_ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke device authorization' })
  async deactivate(
    @Param('id') id: string,
    @Body('tenantId') tenantId: string,
  ) {
    return this.devicesService.deactivateDevice(id, tenantId);
  }
}
