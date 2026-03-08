import { IsString, IsNumber, IsDateString, Min } from 'class-validator';

export class CreateShowDto {
  @IsDateString()
  startTime!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsString()
  eventId!: string;

  @IsString()
  screenId!: string;
}
