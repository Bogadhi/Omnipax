import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DateRangeDto {
  @ApiPropertyOptional({ description: 'Start date in ISO 8601 format (e.g., 2026-02-01)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date in ISO 8601 format (e.g., 2026-02-28)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
