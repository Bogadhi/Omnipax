import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TicketsService, ScanStatus } from './tickets.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScanAuthGuard } from './guards/scan-auth.guard';
import { Role } from '@prisma/client';
import { FeatureKey } from 'ticket-booking-shared';
import { RequiresFeature } from '../platform/decorators/requires-feature.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { Request } from 'express';

import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

// Define structure mapped to Swagger documentation
class ScanTicketDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  qrToken!: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  deviceId?: string;
}

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: Role;
  };
  tenantId?: string;
}

@ApiTags('Tickets & Entry Management')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('scan')
  @UseGuards(ScanAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.SCANNER_DEVICE)
  @RequiresFeature(FeatureKey.SCANNER_VALIDATION)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statically validate a QR token against isolated constraints' })
  @ApiResponse({ status: 201, description: 'Evaluation mapped logically to defined Enums. NEVER Returns 500 on validation failure.' })
  async scanTicket(
    @Body() body: ScanTicketDto,
    @Req() req: any // Using any to handle both User and Device payload structures
  ) {
    const userOrDevice = req.user;
    const isDevice = userOrDevice.role === Role.SCANNER_DEVICE;
    
    const scannerId = isDevice ? userOrDevice.deviceId : userOrDevice.userId;
    const scannerTenantId = isDevice ? userOrDevice.tenantId : (req.tenant?.id || '');
    const scanSource = isDevice ? 'DEVICE' : 'STAFF';

    return this.ticketsService.scanTicket(
      body.qrToken,
      scannerId,
      scannerTenantId,
      isDevice ? userOrDevice.deviceId : (body.deviceId || req.ip),
      scanSource as 'STAFF' | 'DEVICE'
    );
  }

  @Get('booking/:bookingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.STAFF, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Returns generated tickets mapped strictly to booking instance.' })
  async getTicketsForBooking(
    @Param('bookingId') bookingId: string,
    @Req() req: any
  ) {
    const activeTenantId = req.tenantId || '';
    return this.ticketsService.getTicketsForBooking(bookingId, activeTenantId);
  }
}
