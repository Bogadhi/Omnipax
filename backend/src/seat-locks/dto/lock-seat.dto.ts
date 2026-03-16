import { IsString } from 'class-validator';

export class LockSeatDto {
  @IsString()
  eventId!: string;

  @IsString()
  seatId!: string;
}
