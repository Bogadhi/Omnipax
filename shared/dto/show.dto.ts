import { IsString, IsDateString, IsNumber, Min } from 'class-validator';

export class CreateShowDto {
  @IsString()
  eventId!: string;

  @IsString()
  screenId!: string;

  @IsDateString()
  startTime!: string;

  @IsNumber()
  @Min(0)
  basePrice!: number;
}

export interface ShowDto {
  id: string;
  startTime: string;
  price: number;
  isActive: boolean;
  totalCapacity: number;
  remainingCapacity: number;
}
