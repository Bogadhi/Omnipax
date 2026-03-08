import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlatformService } from './platform.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateTenantStatusDto, UpdateTenantPlanDto } from './dto/platform.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Platform Governance')
@Controller('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@ApiBearerAuth()
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants with summary stats' })
  async getAllTenants() {
    return this.platformService.getAllTenants();
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Get detailed tenant record' })
  async getTenantById(@Param('id') id: string) {
    return this.platformService.getTenantById(id);
  }

  @Patch('tenants/:id/status')
  @ApiOperation({ summary: 'Suspend or activate a tenant' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
  ) {
    return this.platformService.updateTenantStatus(id, dto.status);
  }

  @Patch('tenants/:id/plan')
  @ApiOperation({ summary: 'Change tenant subscription plan' })
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdateTenantPlanDto,
  ) {
    return this.platformService.updateTenantPlan(id, dto.plan, dto.bookingLimit);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Global platform analytics' })
  async getStats() {
    return this.platformService.getGlobalStats();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'platform-wide audit trails' })
  async getAuditLogs(
    @Query('tenantId') tenantId?: string,
    @Query('role') role?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.platformService.getAuditLogs({ tenantId, role, from, to });
  }

  @Get('tenants/:id/health')
  @ApiOperation({ summary: 'Get real-time tenant health and anomaly status' })
  async getTenantHealth(@Param('id') id: string) {
    return this.platformService.getTenantHealth(id);
  }
}
