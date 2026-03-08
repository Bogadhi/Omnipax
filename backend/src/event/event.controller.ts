import {
  Controller,
  Get,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { EventService } from './event.service';
import { Request } from 'express';
import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  async findAll(
    @Req() req: Request,
    @Query() query: PaginationQueryDto,
  ) {
    const tenantId = (req as any).tenant?.id;

    return this.eventService.findAll(
      tenantId,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const tenantId = (req as any).tenant?.id;

    return this.eventService.findOne(id, tenantId);
  }

  @Get('test-prisma')
  async testPrisma() {
    return this.eventService.testPrisma();
  }
}
