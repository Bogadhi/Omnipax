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

/**
 * DTO for creating an event via the Admin panel.
 * Must match the frontend CreateEventPayload shape exactly.
 * ValidationPipe with whitelist:true will reject any extra fields.
 */
export class CreateEventDto {
  @IsString()
  title!: string;

  @IsEnum(EventType)
  type!: EventType;

  @IsString()
  language!: string;

  @IsInt()
  @Min(1)
  duration!: number; // minutes

  // ── Scheduling & Location ──────────────────────────────────────────────────

  @IsDateString()
  date!: string; // ISO 8601 — e.g. "2026-04-01T18:30:00.000Z"

  @IsString()
  location!: string;

  // ── Pricing & Capacity ─────────────────────────────────────────────────────

  @IsNumber()
  @Min(0)
  price!: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  totalSeats?: number;

  // ── Optional Media ──────────────────────────────────────────────────────────

  @IsUrl()
  @IsOptional()
  posterUrl?: string;

  @IsUrl()
  @IsOptional()
  bannerUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
