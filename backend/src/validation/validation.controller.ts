import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ValidationService } from './validation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}

  @Post('validate-ticket')
  @Throttle({ default: { limit: process.env.NODE_ENV === 'development' ? 1000 : 100, ttl: 60000 } })
  async validateTicket(
    @Body() body: { bookingId: string; qrToken: string },
    @Request() req: any,
  ) {
    return this.validationService.validateTicket(
      body.bookingId,
      body.qrToken,
      req.user.id,
    );
  }

  @Get('admin/scan-logs')
  async getScanLogs() {
    return this.validationService.getScanLogs();
  }
}
