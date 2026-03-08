import { IsString, IsEnum, IsInt, IsOptional, IsUrl, IsDateString } from 'class-validator';

export enum EventType {
  CONCERT = 'CONCERT',
  MOVIE = 'MOVIE',
  SPORTS = 'SPORTS',
  OTHER = 'OTHER',
}

export class CreateEventDto {
  @IsString()
  title!: string;

  @IsEnum(EventType)
  type!: EventType;

  @IsString()
  language!: string;

  @IsInt()
  duration!: number;

  @IsOptional()
  @IsUrl()
  posterUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  date!: string;

  @IsString()
  location!: string;

  @IsInt()
  price!: number;

  @IsInt()
  @IsOptional()
  totalSeats?: number;

  @IsInt()
  @IsOptional()
  availableSeats?: number;
}

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;

  @IsString()
  @IsOptional()
  language?: string;

  @IsInt()
  @IsOptional()
  duration?: number;
}

export class FilterEventsDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}

export interface EventDto {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
  posterUrl?: string;
}
