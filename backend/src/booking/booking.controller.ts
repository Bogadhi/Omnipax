import {
  Controller,
  UseGuards,
  Request,
  Param,
  Get,
  Post,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { ConfirmBookingDto } from 'ticket-booking-shared';
import { BookingService } from './booking.service';
import { SeatLockService } from '../seat-lock/seat-lock.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    tenantId: string;
    email?: string;
  };
}

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly seatLockService: SeatLockService,
  ) {}

  /* ======================================================
     LOCK SEATS (NEW ENDPOINT)
  ====================================================== */

  @Post('lock')
  async lockSeats(
    @Body() body: { showId: string; seatNumbers: string[] },
    @Request() req: AuthenticatedRequest,
  ) {
    const { showId, seatNumbers } = body;

    if (!showId || !seatNumbers || !Array.isArray(seatNumbers)) {
      throw new BadRequestException('showId and seatNumbers[] are required');
    }

    return this.bookingService.lockSeats(
      showId,
      seatNumbers,
      req.user.id,
      req.user.tenantId,
    );
  }

  /* ======================================================
     CANCEL BOOKING
  ====================================================== */

  @Post(':id/cancel')
  async cancelBooking(@Param('id') id: string, @Request() req: any) {
    return this.bookingService.cancelBooking(id, req.user.id);
  }

  /* ======================================================
     USER BOOKINGS
  ====================================================== */

  @Get('my-bookings')
  async getUserBookings(@Request() req: any) {
    return this.bookingService.getUserBookings(req.user.id);
  }

  @Get(':id')
  async getBookingById(@Param('id') id: string, @Request() req: any) {
    return this.bookingService.getBookingById(id, req.user.id);
  }

  /* ======================================================
     PAYMENT CONFIRMATION
  ====================================================== */

  @Post('confirm')
  async confirmPayment(
    @Body() body: ConfirmBookingDto,
    @Request() req: any,
  ) {
    return this.bookingService.confirmPayment(
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature,
      req.user.id,
    );
  }
}
