import { IsString, IsInt, Min } from 'class-validator';

export class CreateScreenDto {
  @IsString()
  theaterId!: string;

  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  totalSeats!: number;
}
