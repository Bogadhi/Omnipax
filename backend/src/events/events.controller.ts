import { Controller, Get, Param, Post, UseGuards, Body } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Tenant } from '../common/decorators/tenant.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtUser, TenantContext } from '../common/types/request-context.type';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post()
  createEvent(@Tenant() tenant: TenantContext, @Body() dto: CreateEventDto) {
    return this.eventsService.createEvent(tenant.id, dto);
  }

  @UseGuards(TenantGuard)
  @Get()
  listEvents(@Tenant() tenant: TenantContext) {
    return this.eventsService.listEvents(tenant.id);
  }

  @UseGuards(OptionalJwtAuthGuard, TenantGuard)
  @Get(':eventId/seats')
  getSeatMap(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser | null,
    @Param('eventId') eventId: string,
  ) {
    return this.eventsService.getSeatMap(
      tenant.id,
      tenant.slug,
      eventId,
      user?.id,
    );
  }
}
