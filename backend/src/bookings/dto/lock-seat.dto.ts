import { IsString } from 'class-validator';

export class LockSeatDto {
  @IsString()
  showId!: string;

  @IsString()
  seatId!: string;
}
