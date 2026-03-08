import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  Param,
  Inject,
  forwardRef,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { PaymentService } from '../payment/payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateShowDto } from './dto/create-show.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
  ) {}

  // ─── Stats / Summary ──────────────────────────────────────────────────────

  /**
   * GET /admin/stats
   * Called by the frontend admin dashboard summary cards.
   * Aliased from /analytics/overview so the frontend does not need to change.
   */
  @Get('stats')
  async getStats(@Req() req: Request) {
    const tenantId = (req as any).tenant?.id as string | undefined;
    return this.adminService.getAnalyticsOverview(tenantId);
  }

  /** GET /admin/summary — alias used by some frontend dashboard calls */
  @Get('summary')
  async getSummary(@Req() req: Request) {
    const tenantId = (req as any).tenant?.id as string | undefined;
    return this.adminService.getAnalyticsOverview(tenantId);
  }

  @Get('analytics/overview')
  async getAnalyticsOverview(@Req() req: Request) {
    const tenantId = (req as any).tenant?.id as string | undefined;
    return this.adminService.getAnalyticsOverview(tenantId);
  }


  // ─── Events ───────────────────────────────────────────────────────────────

  @Get('events')
  async getEvents() {
    return this.adminService.getAllEvents();
  }

  @Post('events')
  async createEvent(@Body() dto: CreateEventDto, @Req() req: Request) {
    const tenantId = (req as any).tenant?.id as string;
    return this.adminService.createEvent(dto, tenantId);
  }

  // ─── Bookings ─────────────────────────────────────────────────────────────

  @Post('bookings/:id/refund')
  async refundBooking(@Param('id') id: string) {
    return this.paymentService.refundPayment(id);
  }

  @Get('bookings')
  async getBookings(@Query('status') status?: string) {
    return this.adminService.getBookings(status);
  }

  // ─── Shows ────────────────────────────────────────────────────────────────

  @Get('shows')
  async getShows(
    @Query('limit') limitArg?: string,
    @Query('cursor') cursor?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const limit = limitArg ? parseInt(limitArg, 10) : 10;
    return this.adminService.getShows(limit, cursor, {
      search,
      startDate,
      endDate,
    });
  }

  @Post('shows')
  async createShow(@Body() dto: CreateShowDto, @Req() req: Request) {
    const tenantId = (req as any).tenant?.id as string;
    return this.adminService.createShow(
      dto.eventId,
      dto.screenId,
      new Date(dto.startTime),
      dto.basePrice,
      tenantId,
    );
  }

  // ─── Theaters ─────────────────────────────────────────────────────────────

  @Get('theaters')
  async getTheaters() {
    return this.adminService.getTheaters();
  }

  @Get('theaters/:id/screens')
  async getScreens(@Param('id') theaterId: string) {
    return this.adminService.getScreens(theaterId);
  }
}
