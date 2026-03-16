import { Body, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { RequestContext } from '../common/types/request-context.type';
import { BookingsService } from '../bookings/bookings.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('webhook')
  @HttpCode(200)
  webhook(
    @Req() request: RequestContext,
    @Headers('x-razorpay-signature') signature: string,
    @Headers('x-razorpay-event-id') eventId: string | undefined,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.bookingsService.processPaymentWebhook(
      request.rawBody || '',
      signature,
      eventId,
      payload,
    );
  }
}
