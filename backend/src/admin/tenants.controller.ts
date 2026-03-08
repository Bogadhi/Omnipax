import { Controller, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateMonetizationDto } from './dto/monetization.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin - Tenants')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class TenantsController {
  constructor(private readonly adminService: AdminService) {}

  @Patch(':tenantId/monetization')
  @ApiOperation({ summary: 'Update monetization settings for a tenant' })
  async updateMonetization(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateMonetizationDto,
    @Req() req: any,
  ) {
    return this.adminService.updateMonetization(tenantId, dto, req.user.sub);
  }
}
