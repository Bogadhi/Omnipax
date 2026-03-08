import { Controller, Get, Param, Query, Req, UseGuards, Res, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiProduces } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { DateRangeDto } from './dto/date-range.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Response, Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
  tenantId?: string;
}

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  private getTenantId(req: AuthenticatedRequest): string {
    if (!req.tenantId && req.user.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException('Tenant ID is required for theater-level analytics');
    }
    return req.tenantId || '';
  }
 
  @Get('revenue-summary')
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get overall revenue summary for a theater' })
  @ApiOkResponse({ description: 'Revenue metrics' })
  async getTheaterRevenueSummary(
    @Req() req: AuthenticatedRequest,
    @Query() dateRange: DateRangeDto,
  ) {
    return this.analyticsService.getTheaterRevenueSummary(
      this.getTenantId(req),
      dateRange.from,
      dateRange.to,
    );
  }

  @Get('show/:showId')
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get analytics for a specific show' })
  @ApiOkResponse({ description: 'Show level metrics' })
  async getShowAnalytics(
    @Req() req: AuthenticatedRequest,
    @Param('showId') showId: string,
  ) {
    return this.analyticsService.getShowAnalytics(showId, this.getTenantId(req));
  }

  @Get('funnel')
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get booking funnel conversions' })
  @ApiOkResponse({ description: 'Booking funnel metrics' })
  async getBookingFunnelMetrics(
    @Req() req: AuthenticatedRequest,
    @Query() dateRange: DateRangeDto,
  ) {
    return this.analyticsService.getBookingFunnelMetrics(
      this.getTenantId(req),
      dateRange.from,
      dateRange.to,
    );
  }

  @Get('daily-revenue')
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get daily revenue time series' })
  @ApiOkResponse({ description: 'Array of date and true net revenue' })
  async getDailyRevenueTimeSeries(
    @Req() req: AuthenticatedRequest,
    @Query() dateRange: DateRangeDto,
  ) {
    return this.analyticsService.getDailyRevenueTimeSeries(
      this.getTenantId(req),
      dateRange.from,
      dateRange.to,
    );
  }

  @Get('settlement')
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get financial settlement analytics' })
  async getSettlement(
    @Query('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.analyticsService.getSettlementAnalytics(tenantId, from, to);
  }

  @Get('platform-summary')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'SuperAdmin only platform aggregate dashboard' })
  @ApiOkResponse({ description: 'Platform level metrics summing all theaters' })
  async getPlatformSummary(
    @Req() req: AuthenticatedRequest,
    @Query() dateRange: DateRangeDto,
  ) {
    return this.analyticsService.getPlatformSummary(
      req.user.role,
      dateRange.from,
      dateRange.to,
    ); // Defensively passing Role
  }

  @Get('export')
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Stream CSV export of exact PaymentLedger transactions',
  })
  @ApiProduces('text/csv')
  async exportRevenueCsv(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Query() dateRange: DateRangeDto,
  ) {
    return this.analyticsService.exportRevenueCsvStream(
      this.getTenantId(req),
      res,
      dateRange.from,
      dateRange.to,
    );
  }
}
