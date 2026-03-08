import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
  Request,
  Get,
  UseInterceptors,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LockSeatsDto } from './dto/lock-seats.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateShowDto } from './dto/create-show.dto';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';

@Controller('shows')
@UseGuards(JwtAuthGuard)
export class ShowController {
  constructor(private readonly bookingService: BookingService) {}

  @Post(':id/lock-seats')
  @UseInterceptors(IdempotencyInterceptor)
  async lockSeats(
    @Param('id') showId: string,
    @Body() body: LockSeatsDto,
    @Request() req: any,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.bookingService.lockSeats(showId, body.seatNumbers, req.user.id, req.user.tenantId);
  }

  @Post(':id/lock-ga')
  async lockGA(
    @Param('id') showId: string,
    @Body('qty') qty: number,
    @Request() req: any,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.bookingService.lockGeneralAdmission(req.user.id, showId, qty);
  }

  @Get(':id/seats')
  async getSeats(@Param('id') showId: string) {
    return this.bookingService.getSeats(showId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() createShowDto: CreateShowDto) {
    return this.bookingService.createShow(createShowDto);
  }

  @Post(':id/delete') // Using POST for delete if DELETE method issues, but standard REST is DELETE.
  // Actually, let's use DELETE decorator.
  // Wait, method name 'delete' might conflict if not careful? No.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async delete(@Param('id') id: string) {
    return this.bookingService.deleteShow(id);
  }
}
