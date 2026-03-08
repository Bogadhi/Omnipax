import {
  IsArray,
  IsNotEmpty,
  IsString,
  ArrayMaxSize,
  ArrayMinSize,
  Matches,
} from 'class-validator';

/**
 * DTO for the POST /bookings/lock endpoint.
 *
 * seatNumbers must be an array of strings matching the format:
 *   One or more uppercase/lowercase letters followed by one or more digits.
 *   Examples: "A1", "C12", "B5", "AB10"
 *
 * The regex is enforced here at the HTTP boundary BEFORE reaching the service.
 */
export class LockSeatsDto {
  @IsString()
  @IsNotEmpty()
  showId!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one seat must be selected' })
  @ArrayMaxSize(10, { message: 'Maximum 10 seats allowed per booking' })
  @IsString({ each: true })
  @Matches(/^[A-Za-z]+\d+$/, {
    each: true,
    message:
      'Each seat code must be letter(s) followed by digit(s), e.g. "A1", "C12"',
  })
  seatNumbers!: string[];
}
