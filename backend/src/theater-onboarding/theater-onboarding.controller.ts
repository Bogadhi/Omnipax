import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TheaterOnboardingService } from './theater-onboarding.service';
import { CreateTheaterApplicationDto, ReviewTheaterApplicationDto } from 'ticket-booking-shared';
import { ApplicationStatus, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleGuard } from '../common/guards/role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('Theater Onboarding')
@Controller()
export class TheaterOnboardingController {
  constructor(private readonly onboardingService: TheaterOnboardingService) {}

  @Post('theater/apply')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Apply publicly for theater self-onboarding' })
  @ApiResponse({ status: 201, description: 'Application submitted successfully' })
  async apply(@Body() dto: CreateTheaterApplicationDto) {
    await this.onboardingService.apply(dto);
    return {
      message: 'Your application has been received and is under review.',
    };
  }
 
  @ApiBearerAuth()
  @Get('superadmin/theater-applications')
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @ApiOperation({ summary: 'List all theater applications' })
  async getApplications(
    @Query('status') status?: ApplicationStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.onboardingService.getApplications(
      status,
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 10,
    );
  }
 
  @ApiBearerAuth()
  @Patch('superadmin/theater-applications/:id/review')
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @ApiOperation({ summary: 'Review a theater application' })
  async reviewApplication(
    @Param('id') id: string,
    @Body() dto: ReviewTheaterApplicationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.onboardingService.reviewApplication(id, req.user.id, dto);
  }
}
