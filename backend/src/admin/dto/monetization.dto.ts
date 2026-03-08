import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { PlatformFeeType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMonetizationDto {
  @ApiProperty({ description: 'Enable or disable platform fee' })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiProperty({ enum: PlatformFeeType, description: 'Type of platform fee' })
  @IsEnum(PlatformFeeType)
  @IsOptional()
  type?: PlatformFeeType;

  @ApiProperty({ description: 'Value of the fee (Percentage or Flat)' })
  @IsNumber()
  @Min(0)
  @Max(1000)
  @IsOptional()
  value?: number;
}
