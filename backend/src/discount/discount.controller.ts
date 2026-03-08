import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { DiscountService } from './discount.service';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('discounts')
@UseGuards(JwtAuthGuard)
export class DiscountController {
  constructor(private readonly discountService: DiscountService) {}

  /**
   * POST /discounts/apply
   * Applies a coupon code and/or gift card to a locked booking.
   * Must be called BEFORE createRazorpayOrder.
   */
  @Post('apply')
  @HttpCode(200)
  async applyDiscount(@Body() dto: ApplyDiscountDto, @Request() req: any) {
    // Booking ownership is validated inside DiscountService via JWT user check
    return this.discountService.applyDiscounts({
      bookingId: dto.bookingId,
      couponCode: dto.couponCode,
      giftCardCode: dto.giftCardCode,
    });
  }
}
