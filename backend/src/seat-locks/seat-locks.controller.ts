import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Tenant } from '../common/decorators/tenant.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtUser, TenantContext } from '../common/types/request-context.type';
import { LockSeatDto } from './dto/lock-seat.dto';
import { UnlockSeatDto } from './dto/unlock-seat.dto';
import { SeatLocksService } from './seat-locks.service';

@Controller('seat-locks')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SeatLocksController {
  constructor(private readonly seatLocksService: SeatLocksService) {}

  @Post()
  lockSeat(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Body() dto: LockSeatDto,
  ) {
    return this.seatLocksService.lockSeat(
      tenant.slug,
      dto.eventId,
      dto.seatId,
      user.id,
    );
  }

  @Delete()
  unlockSeat(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Body() dto: UnlockSeatDto,
  ) {
    return this.seatLocksService.unlockSeat(
      tenant.slug,
      dto.eventId,
      dto.seatId,
      user.id,
    );
  }
}
