import { IsString, IsOptional } from 'class-validator';

export class ApplyDiscountDto {
  @IsString()
  bookingId!: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  giftCardCode?: string;
}
