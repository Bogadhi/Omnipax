import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUrl,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import { EventType } from '@prisma/client';

export class CreateEventDto {
  @IsString()
  title!: string;

  @IsEnum(EventType)
  type!: EventType;

  @IsString()
  language!: string;

  @IsInt()
  @Min(1)
  duration!: number; // in minutes

  @IsUrl()
  @IsOptional()
  posterUrl?: string;

  @IsUrl()
  @IsOptional()
  bannerUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  date!: string; // ISO Date String

  @IsString()
  location!: string;

  @IsNumber()
  @Min(0)
  price!: number;
}
