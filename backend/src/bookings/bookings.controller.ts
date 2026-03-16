import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Tenant } from '../common/decorators/tenant.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtUser, TenantContext } from '../common/types/request-context.type';
import { InitiateBookingDto } from './dto/initiate-booking.dto';
import { VerifyTicketDto } from './dto/verify-ticket.dto';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post('initiate')
  initiateBooking(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Body() dto: InitiateBookingDto,
  ) {
    return this.bookingsService.initiateBooking(tenant, user.id, dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('me')
  listMyBookings(@Tenant() tenant: TenantContext, @CurrentUser() user: JwtUser) {
    return this.bookingsService.listMyBookings(tenant.id, user.id);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get(':bookingId/ticket')
  getTicketByBookingId(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Param('bookingId') bookingId: string,
  ) {
    return this.bookingsService.getTicketByBookingId(
      tenant.id,
      bookingId,
      user.id,
    );
  }

  @UseGuards(TenantGuard)
  @Post('verify-ticket')
  verifyTicket(@Tenant() tenant: TenantContext, @Body() dto: VerifyTicketDto) {
    return this.bookingsService.verifyTicket(tenant.id, dto);
  }
}
