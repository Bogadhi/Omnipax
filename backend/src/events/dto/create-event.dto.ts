import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateEventDto {
  @IsString()
  name!: string;

  @IsDateString()
  startsAt!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalSeats!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatStartNumber?: number;
}
