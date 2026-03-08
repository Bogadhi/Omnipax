import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import { BookingService } from '../booking/booking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';

@Controller('shows')
export class ShowController {
  constructor(private readonly bookingService: BookingService) {}

  /* ===============================
     GET SEATS FOR SHOW
  =============================== */

  @Get(':id/seats')
  async getSeats(@Param('id') showId: string) {
    return this.bookingService.getSeats(showId);
  }

  /* ===============================
     LOCK SEATS
  =============================== */

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Post(':id/lock-seats')
  async lockSeats(
    @Param('id') showId: string,
    @Body() body: { seatIds: string[] },
    @Request() req: any,
  ) {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    return this.bookingService.lockSeats(showId, body.seatIds, userId, tenantId);
  }
}
