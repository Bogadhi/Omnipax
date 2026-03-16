import { IsString } from 'class-validator';

export class UnlockSeatDto {
  @IsString()
  eventId!: string;

  @IsString()
  seatId!: string;
}
