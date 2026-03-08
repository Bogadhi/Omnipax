import {
  IsArray,
  IsNotEmpty,
  IsString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PaymentDetailsDto {
  @IsString()
  @IsNotEmpty()
  paymentId!: string;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  signature?: string;
}

export class ConfirmBookingDto {
  @IsString()
  @IsNotEmpty()
  showId!: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  seatIds!: string[];

  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  @IsNotEmpty()
  paymentDetails!: PaymentDetailsDto;
}
